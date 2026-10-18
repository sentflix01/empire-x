'use client';
/**
 * Point the camera at a barcode or QR code. Uses the phone's built-in barcode
 * reader when there is one (most Android phones) and loads a small scanning
 * library otherwise (iPhone, computers). Owners can also type the number or
 * pick a photo of the barcode. `continuous` keeps scanning (quick scan mode).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Flashlight, ImageUp, Keyboard, Loader2 } from 'lucide-react';

type Detector = { detect: (source: CanvasImageSource | Blob | ImageBitmap) => Promise<Array<{ rawValue: string }>> };
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'itf'];

function nativeDetector(): Detector | null {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (!BD) return null;
  try { return new BD({ formats: FORMATS }); } catch { return null; }
}

function feedback() {
  try { navigator.vibrate?.(60); } catch { /* not supported */ }
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value = 1200; gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => { void ctx.close(); };
  } catch { /* no sound */ }
}

export default function BarcodeScanner({ onCode, continuous = false, autoStart = true }: {
  onCode: (code: string) => void;
  continuous?: boolean;
  autoStart?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const stopZxing = useRef<(() => void) | null>(null);
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [state, setState] = useState<'idle' | 'starting' | 'scanning' | 'denied' | 'unavailable'>('idle');
  const [torch, setTorch] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [typed, setTyped] = useState('');
  const [typing, setTyping] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  /**
   * The camera sees a barcode many times a second while it's in view: count it
   * once, and again only after it left the view for a moment (two identical
   * items scanned one after the other count twice). Typed codes and photos
   * (`fromCamera` false) always count.
   */
  const emit = useCallback((raw: string, fromCamera = true) => {
    const code = raw.trim();
    if (!code) return;
    const now = Date.now();
    if (fromCamera) {
      const stillInView = code === last.current.code && now - last.current.at < 1000;
      last.current = { code, at: now };
      if (stillInView) return;
    }
    feedback();
    onCode(code);
  }, [onCode]);

  const stop = useCallback(() => {
    stopZxing.current?.(); stopZxing.current = null;
    stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null;
    setState((s) => (s === 'scanning' || s === 'starting' ? 'idle' : s));
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState('unavailable'); return; }
    setState('starting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.current = media;
      const track = media.getVideoTracks()[0];
      setTorchOk(Boolean((track.getCapabilities?.() as { torch?: boolean } | undefined)?.torch));
      if (video.current) { video.current.srcObject = media; await video.current.play().catch(() => undefined); }
      setState('scanning');
      const native = nativeDetector();
      if (native) {
        let running = true;
        stopZxing.current = () => { running = false; };
        const loop = async () => {
          if (!running || !video.current) return;
          try {
            const found = await native.detect(video.current);
            if (found[0]?.rawValue) { emit(found[0].rawValue); if (!continuous) { stop(); return; } }
          } catch { /* frame not ready */ }
          setTimeout(() => { void loop(); }, 250);
        };
        void loop();
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(video.current!, (result) => {
          if (result) { emit(result.getText()); if (!continuous) stop(); }
        });
        stopZxing.current = () => controls.stop();
      }
    } catch (err) {
      const name = (err as { name?: string }).name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }, [continuous, emit, stop]);

  useEffect(() => {
    if (autoStart) void start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track) return;
    try { await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(!torch); } catch { setTorchOk(false); }
  };

  const fromPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true); setPhotoError('');
    try {
      const native = nativeDetector();
      if (native) {
        const found = await native.detect(await createImageBitmap(file));
        if (found[0]?.rawValue) { emit(found[0].rawValue, false); return; }
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const url = URL.createObjectURL(file);
        try { emit((await new BrowserMultiFormatReader().decodeFromImageUrl(url)).getText(), false); return; } finally { URL.revokeObjectURL(url); }
      }
      setPhotoError('No barcode found in that photo. Try a closer, sharper picture.');
    } catch {
      setPhotoError('No barcode found in that photo. Try a closer, sharper picture.');
    } finally { setPhotoBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '4 / 3' }}>
        <video ref={video} playsInline muted aria-label="Camera view" className={`h-full w-full object-cover ${state === 'scanning' ? '' : 'opacity-0'}`} />
        {state === 'scanning' && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[38%] -translate-y-1/2 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            <p className="absolute inset-x-0 bottom-2 text-center text-xs font-medium text-white/90">Hold the barcode inside the box</p>
            {torchOk && (
              <button type="button" onClick={toggleTorch} aria-pressed={torch} aria-label={torch ? 'Turn light off' : 'Turn light on'}
                className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white">
                <Flashlight className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </>
        )}
        {state !== 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-white/90">
            {state === 'starting' && <><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />Opening the camera…</>}
            {state === 'idle' && (
              <button type="button" onClick={() => void start()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-black">
                <Camera className="h-4 w-4" aria-hidden="true" />Start camera
              </button>
            )}
            {state === 'denied' && (
              <><CameraOff className="h-6 w-6" aria-hidden="true" />
                <p>Camera access is off. Allow the camera for this site in your browser settings, or type the number below.</p>
                <button type="button" onClick={() => void start()} className="min-h-10 rounded-full border border-white/60 px-4">Try again</button></>
            )}
            {state === 'unavailable' && <><CameraOff className="h-6 w-6" aria-hidden="true" /><p>No camera found. Type the number or pick a photo of the barcode.</p></>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTyping((v) => !v)} aria-expanded={typing}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-secondary">
          <Keyboard className="h-4 w-4" aria-hidden="true" />Type the number
        </button>
        <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-secondary">
          {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImageUp className="h-4 w-4" aria-hidden="true" />}
          Scan from a photo
          <input type="file" accept="image/*" className="sr-only" aria-label="Scan from a photo" onChange={(e) => { void fromPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      {typing && (
        <form onSubmit={(e) => { e.preventDefault(); emit(typed, false); setTyped(''); if (!continuous) setTyping(false); }} className="flex gap-2">
          <input value={typed} onChange={(e) => setTyped(e.target.value.replace(/[^\d\s-]/g, ''))} inputMode="numeric" autoFocus
            placeholder="e.g. 6 290000 000000" aria-label="Barcode number"
            className="min-h-11 flex-1 rounded-full border border-border bg-background px-4 font-mono text-sm" />
          <button type="submit" disabled={!typed.trim()} className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Find</button>
        </form>
      )}
      {photoError && <p role="alert" className="text-xs text-destructive">{photoError}</p>}
    </div>
  );
}
