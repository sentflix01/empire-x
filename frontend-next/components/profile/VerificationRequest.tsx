'use client';
import SafeImage from '@/components/ui/SafeImage';
/**
 * VerificationRequest — allows users to submit a selfie + ID document
 * for admin review to receive a verified badge on their profile.
 *
 * Flow:
 *   1. User takes a selfie (camera capture or file upload)
 *   2. User uploads an ID document (passport, national ID, driver's license)
 *   3. Both go to private storage (POST /api/verification/documents), which
 *      returns a reference, never a public URL (audit F-013). Previews use the
 *      file on the device, so the document is never fetched back to show it.
 *   4. The references are submitted for admin review
 *   5. Admin approves → user gets a verified badge
 */
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Clock, XCircle, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/lib/api/client';

type DocumentKind = 'selfie' | 'id';

/** Stores the document privately and returns its reference ("private:…"). */
async function uploadDocument(file: File, kind: DocumentKind): Promise<string> {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', file);
  const { data } = await client.post<{ ref: string }>('/api/verification/documents', form);
  return data.ref;
}
import VerifiedBadge from '@/components/ui/VerifiedBadge';

interface VerificationStatus {
  is_verified: boolean;
  verification_type: string | null;
  verified_at: string | null;
  request: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    verification_type: string;
    admin_note: string | null;
    created_at: string;
    reviewed_at: string | null;
  } | null;
}

export default function VerificationRequest() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  // Previews are local blob: URLs; refs are the private storage references sent on submit.
  const [selfieUrl, setSelfieUrl] = useState('');
  const [idDocUrl, setIdDocUrl] = useState('');
  const [selfieRef, setSelfieRef] = useState('');
  const [idDocRef, setIdDocRef] = useState('');

  function setDocument(kind: DocumentKind, file: File | null, ref: string) {
    const setPreview = kind === 'selfie' ? setSelfieUrl : setIdDocUrl;
    setPreview((previous) => {
      if (previous.startsWith('blob:')) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : '';
    });
    (kind === 'selfie' ? setSelfieRef : setIdDocRef)(ref);
  }
  const clearDocuments = () => { setDocument('selfie', null, ''); setDocument('id', null, ''); };
  const [verType, setVerType] = useState<'personal' | 'business' | 'creator'>('personal');
  const [uploadingType, setUploadingType] = useState<'selfie' | 'id' | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function fetchStatus() {
    try {
      const { data } = await client.get<VerificationStatus>('/api/verification/status');
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // ── Camera helpers ────────────────────────────────────────────────────────
  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera access denied. Please allow camera access or upload a photo instead.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror the image (front camera is mirrored by CSS, capture should also mirror)
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    setUploadingType('selfie');
    try {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85)
      );
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setDocument('selfie', file, await uploadDocument(file, 'selfie'));
      stopCamera();
      toast.success('Selfie captured!');
    } catch {
      toast.error('Failed to upload selfie. Try again.');
    } finally {
      setUploadingType(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'selfie' | 'id') {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
    setUploadingType(type);
    try {
      setDocument(type, file, await uploadDocument(file, type));
      toast.success(`${type === 'selfie' ? 'Selfie' : 'ID document'} uploaded!`);
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploadingType(null);
      e.target.value = '';
    }
  }

  async function handleSubmit() {
    if (!selfieRef || !idDocRef) {
      toast.error('Please provide both a selfie and an ID document.');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/api/verification/request', {
        selfie_ref: selfieRef,
        id_document_ref: idDocRef,
        verification_type: verType,
      });
      toast.success('Verification request submitted! We\'ll review it within 24–48 hours.');
      setShowForm(false);
      clearDocuments();
      fetchStatus();
    } catch {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-4 animate-pulse">
        <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
        <div className="h-3 bg-secondary rounded w-2/3" />
      </div>
    );
  }

  // ── Already verified ──────────────────────────────────────────────────────
  if (status?.is_verified) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Verified Account</span>
          <VerifiedBadge type={status.verification_type as any} size="sm" />
        </div>
        <p className="text-xs text-muted-foreground">
          Your account is verified. Your badge is visible on your profile.
        </p>
      </div>
    );
  }

  // ── Pending request ───────────────────────────────────────────────────────
  if (status?.request?.status === 'pending') {
    return (
      <div className="bg-card rounded-2xl border border-primary/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Verification Pending</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your request was submitted and is under review. This usually takes 24–48 hours.
        </p>
      </div>
    );
  }

  // ── Rejected request ──────────────────────────────────────────────────────
  const isRejected = status?.request?.status === 'rejected';

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {isRejected ? 'Reapply for Verification' : 'Get Verified'}
          </span>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {isRejected ? 'Resubmit' : 'Apply'}
          </button>
        )}
      </div>

      {isRejected && status?.request?.admin_note && !showForm && (
        <div className="mb-3 flex items-start gap-2 bg-destructive-subtle border border-destructive/30 rounded-xl px-3 py-2">
          <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-destructive">Previous request was rejected</p>
            <p className="text-xs text-destructive mt-0.5">{status.request.admin_note}</p>
          </div>
        </div>
      )}

      {!showForm && (
        <p className="text-xs text-muted-foreground">
          Submit a selfie and a government-issued ID for admin review.
          Verified accounts get a blue badge on their profile.
        </p>
      )}

      {showForm && (
        <div className="space-y-4">
          {/* Verification type */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Verification Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['personal', 'business', 'creator'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setVerType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${
                    verType === t
                      ? 'bg-primary text-white border-primary'
                      : 'border-border/50 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Selfie section */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Step 1 — Selfie Photo
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Take a clear photo showing your face and both ears visible.
            </p>

            {selfieUrl ? (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border/50">
                <SafeImage fill={false} width={800} height={600} loading="lazy" src={selfieUrl} alt="selfie" className="w-full h-full object-cover" />
                <button
                  onClick={() => setDocument('selfie', null, '')}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  aria-label="Remove selfie"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Camera preview */}
                {cameraActive && (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 bg-black" style={{ maxWidth: 320 }}>
                    <video
                      ref={videoRef}
                      className="w-full"
                      style={{ transform: 'scaleX(-1)' }}
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-2">
                      <button
                        onClick={capturePhoto}
                        disabled={uploadingType === 'selfie'}
                        className="flex-1 bg-white text-foreground font-semibold text-xs py-2 rounded-full hover:bg-secondary transition-colors"
                      >
                        {uploadingType === 'selfie' ? 'Uploading...' : '📸 Capture'}
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 bg-black/60 text-white text-xs py-2 rounded-full hover:bg-black/80 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="flex items-start gap-2 bg-warning-subtle border border-rating/60 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-xs text-primary">{cameraError}</p>
                  </div>
                )}

                {!cameraActive && (
                  <div className="flex gap-2">
                    <button
                      onClick={startCamera}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" /> Use Camera
                    </button>
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 text-xs font-medium hover:bg-secondary transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingType === 'selfie' ? 'Uploading...' : 'Upload Photo'}
                      <input type="file" accept="image/*" capture="user" className="hidden" onChange={e => handleFileUpload(e, 'selfie')} disabled={!!uploadingType} />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ID document section */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Step 2 — Government ID Document
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload a photo of your national ID, passport, or driver's license.
              The ID will only be visible to Nodbusiness admins and will not be shared.
            </p>

            {idDocUrl ? (
              <div className="relative w-full max-w-xs rounded-xl overflow-hidden border border-border/50">
                <SafeImage fill={false} width={800} height={600} loading="lazy" src={idDocUrl} alt="ID document" className="w-full object-cover" />
                <button
                  onClick={() => setDocument('id', null, '')}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  aria-label="Remove ID"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 text-xs font-medium hover:bg-secondary transition-colors cursor-pointer w-fit">
                <Upload className="w-3.5 h-3.5" />
                {uploadingType === 'id' ? 'Uploading...' : 'Upload ID Document'}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'id')} disabled={!!uploadingType} />
              </label>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting || !selfieRef || !idDocRef}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button
              onClick={() => { setShowForm(false); clearDocuments(); stopCamera(); }}
              className="px-4 py-2.5 rounded-xl border border-border/50 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            🔒 Your documents are stored securely and only visible to Nodbusiness admins.
            We do not share your personal data with third parties.
          </p>
        </div>
      )}
    </div>
  );
}
