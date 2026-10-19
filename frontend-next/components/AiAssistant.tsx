'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { X, Send, RotateCcw, Wifi, WifiOff, Compass, Square } from "lucide-react";
import client from "@/api/client";
import { offlineAnswer } from "@/lib/aiOffline";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
  offline?: boolean; // true if answered by local engine
  ts: number;        // timestamp for display
}

const STORAGE_KEY = "nodbusiness_ai_history";
const MAX_STORED = 60;
const ASSISTANT_BUTTON_SIZE = 56;

function getAssistantViewportSize() {
  return {
    width: Math.max(1, Math.min(window.innerWidth, window.visualViewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight)),
  };
}

function readSafeAreaBottom(): number {
  try {
    const probe = document.createElement('div');
    probe.dataset.aiSafeAreaProbe = 'true';
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom, 0px)';
    document.body.appendChild(probe);
    const inset = Number.parseFloat(window.getComputedStyle(probe).paddingBottom);
    probe.remove();
    return Number.isFinite(inset) ? inset : 0;
  } catch {
    return 0;
  }
}

function clampAssistantPosition(position: { x: number; y: number }, viewportWidth: number, viewportHeight: number, safeAreaBottom = 0) {
  const edgeMargin = 8;
  const maxX = Math.max(0, viewportWidth - ASSISTANT_BUTTON_SIZE - edgeMargin);
  const maxY = Math.max(0, viewportHeight - ASSISTANT_BUTTON_SIZE - safeAreaBottom - edgeMargin);
  return {
    x: Math.min(Math.max(edgeMargin, position.x), maxX),
    y: Math.min(Math.max(edgeMargin, position.y), maxY),
  };
}

function getGuidePage(pathname: string): string {
  const dynamicRoutes: Array<[RegExp, string]> = [
    [/^\/products\/[^/]+$/, "/products/[id]"],
    [/^\/profile\/[^/]+$/, "/profile/[id]"],
    [/^\/p\/[^/]+$/, "/p/[username]"],
    [/^\/showrooms\/[^/]+$/, "/showrooms/[id]"],
    [/^\/showroom\/[^/]+$/, "/showroom/[slug]"],
    [/^\/hashtag\/[^/]+$/, "/hashtag/[name]"],
    [/^\/messages\/[^/]+$/, "/messages/[id]"],
  ];
  return dynamicRoutes.find(([pattern]) => pattern.test(pathname))?.[1]
    ?? (pathname.length <= 80 ? pathname : "current app page");
}

function getViewportClass(): "compact" | "medium" | "wide" {
  if (window.innerWidth < 640) return "compact";
  if (window.innerWidth < 1024) return "medium";
  return "wide";
}

function AssistantLogo({ size = "sm", animated = false }: { size?: "xs" | "sm" | "md"; animated?: boolean }) {
  const sizeClass = size === "md" ? "w-11 h-11" : size === "sm" ? "w-7 h-7" : "w-6 h-6";
  const imageClass = size === "md" ? "w-9 h-9" : size === "sm" ? "w-5 h-5" : "w-4 h-4";

  return (
    <span
      className={`${sizeClass} ai-logo-orb ${animated ? "ai-logo-orb-active" : ""} relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-white/35`}
      aria-hidden="true"
    >
      <Image
        src="/brand/nodbusiness-icon.svg"
        alt=""
        width={44}
        height={44}
        loading="eager"
        className={`${imageClass} rounded-full object-cover`}
      />
      {animated && <span className="ai-logo-blink" />}
    </span>
  );
}

function AssistantFlipCoin() {
  return (
    <span className="ai-flip-coin" aria-hidden="true">
      <span className="ai-flip-coin-inner">
        <span className="ai-flip-coin-face ai-flip-coin-front">
          <Image src="/brand/nodbusiness-icon.svg" alt="" width={48} height={48} loading="eager" className="h-10 w-10 rounded-full object-cover" />
        </span>
        <span className="ai-flip-coin-face ai-flip-coin-back">
          <span className="text-[10px] font-black leading-none text-white">AI</span>
          <span className="mt-0.5 text-[7px] font-bold uppercase leading-none tracking-wide text-blue-100">Assistant</span>
        </span>
      </span>
    </span>
  );
}

/** Load persisted messages from localStorage */
function loadHistory(storageKey: string): Message[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save messages to localStorage, keeping the last MAX_STORED */
function saveHistory(storageKey: string, messages: Message[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {}
}

/** Format a timestamp as "Today HH:MM" or "DD/MM HH:MM" */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return time;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}`;
}

function AiAssistantWidget() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const pathname = usePathname();
  const historyKey = `${STORAGE_KEY}:${user?.id ?? "guest"}:${user?.is_demo ? "demo" : "real"}`;
  const historyKeyRef = useRef(historyKey);
  historyKeyRef.current = historyKey;
  const SUGGESTIONS = [
    t('ai.suggestion1'),
    t('ai.suggestion2'),
    t('ai.suggestion3'),
    t('ai.suggestion4'),
  ];
  const [open, setOpen] = useState(false);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyReadyKey, setHistoryReadyKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [tourActive, setTourActive] = useState(false);
  const tourActiveRef = useRef(false);
  const previousPathname = useRef(pathname);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Draggable position state
  const STORAGE_POS_KEY = "nodbusiness_ai_pos";
  const defaultPos = { x: -1, y: -1 }; // -1 means "use CSS default"
  const [pos, setPos] = useState(defaultPos);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const posRef = useRef(pos);
  const safeAreaBottomRef = useRef(0);
  posRef.current = pos;
  const btnRef = useRef<HTMLButtonElement>(null);

  // Load saved position
  useLayoutEffect(() => {
    try {
      safeAreaBottomRef.current = readSafeAreaBottom();
      const saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { x?: unknown; y?: unknown };
        if (typeof parsed.x === 'number' && Number.isFinite(parsed.x) && typeof parsed.y === 'number' && Number.isFinite(parsed.y)) {
          const viewport = getAssistantViewportSize();
          const next = clampAssistantPosition({ x: parsed.x, y: parsed.y }, viewport.width, viewport.height, safeAreaBottomRef.current);
          posRef.current = next;
          setPos(next);
          localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(next));
        }
      }
    } catch {}
  }, []);

  // A position saved on a large viewport can be outside a smaller window.
  // Keep the draggable launcher reachable after resize, rotation, or docking DevTools.
  useEffect(() => {
    const keepLauncherVisible = () => {
      safeAreaBottomRef.current = readSafeAreaBottom();
      const viewport = getAssistantViewportSize();
      setViewportSize(viewport);
      setPos(current => {
        if (current.x < 0 || current.y < 0) return current;
        const next = clampAssistantPosition(current, viewport.width, viewport.height, safeAreaBottomRef.current);
        posRef.current = next;
        if (next.x !== current.x || next.y !== current.y) {
          try { localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(next)); } catch {}
        }
        return next;
      });
    };
    window.addEventListener('resize', keepLauncherVisible);
    window.visualViewport?.addEventListener('resize', keepLauncherVisible);
    return () => {
      window.removeEventListener('resize', keepLauncherVisible);
      window.visualViewport?.removeEventListener('resize', keepLauncherVisible);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open || e.button !== 0) return;
    dragging.current = true;
    didDrag.current = false;
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      if (Math.hypot(e.clientX - dragOrigin.current.x, e.clientY - dragOrigin.current.y) > 4) didDrag.current = true;
      if (!didDrag.current) return;
      e.preventDefault();
      const viewport = getAssistantViewportSize();
      const { x: newX, y: newY } = clampAssistantPosition(
        { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y },
        viewport.width,
        viewport.height,
        safeAreaBottomRef.current,
      );
      const next = { x: newX, y: newY };
      posRef.current = next;
      setPos(next);
    };
    const onUp = (cancelled = false) => {
      if (dragging.current) {
        dragging.current = false;
        try {
          if (posRef.current.x >= 0 && posRef.current.y >= 0) {
            localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(posRef.current));
          }
        } catch {}
        if (cancelled) didDrag.current = false;
      }
    };
    const onPointerUp = () => onUp();
    const onPointerCancel = () => onUp(true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);

  // Compute button style based on drag position
  const btnStyle: React.CSSProperties = pos.x >= 0 && pos.y >= 0
    ? { position: 'fixed', left: pos.x, top: pos.y, bottom: 'auto', right: 'auto', width: 56, height: 56, paddingInline: 0 }
    : { width: 56, height: 56, paddingInline: 0 };

  // Chat panel position — above the button
  const panelStyle: React.CSSProperties = useMemo(() => {
    if (pos.x < 0 || pos.y < 0) return {};
    const viewport = viewportSize ?? getAssistantViewportSize();
    const panelWidth = Math.min(384, Math.max(0, viewport.width - 32));
    const panelHeight = Math.min(500, Math.max(0, viewport.height - 168));
    const left = Math.max(8, Math.min(pos.x + ASSISTANT_BUTTON_SIZE - panelWidth, viewport.width - panelWidth - 8));
    const top = Math.max(8, Math.min(pos.y - panelHeight - 16, viewport.height - panelHeight - 8));
    return { position: 'fixed', left, top, bottom: 'auto', right: 'auto' };
  }, [pos, viewportSize]);

  // Track online/offline and load persisted history after mount
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Conversations are private to the signed-in identity and demo/real mode.
  useEffect(() => {
    setMessages(loadHistory(historyKey));
    setHistoryReadyKey(historyKey);
    setInput("");
    setLoading(false);
  }, [historyKey]);

  // Persist history whenever messages change (client-only)
  useEffect(() => {
    if (typeof window !== "undefined" && historyReadyKey === historyKey) {
      saveHistory(historyKey, messages);
    }
  }, [historyKey, historyReadyKey, messages]);

  // Scroll to bottom on new messages or open
  const visibleMessages = useMemo(
    () => historyReadyKey === historyKey ? messages : [],
    [historyKey, historyReadyKey, messages],
  );
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [visibleMessages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const addMessage = useCallback((msg: Message, expectedKey: string) => {
    if (historyKeyRef.current === expectedKey) setMessages(prev => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (previousPathname.current !== pathname && tourActive) {
      tourActiveRef.current = false;
      setTourActive(false);
      addMessage({ role: "assistant", content: t("ai.tourPageChanged"), ts: Date.now() }, historyKey);
    }
    previousPathname.current = pathname;
  }, [addMessage, historyKey, pathname, t, tourActive]);

  useEffect(() => {
    tourActiveRef.current = false;
    setTourActive(false);
  }, [historyKey]);

  const sendMessage = async (text?: string, options?: { tourMode?: boolean }) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const endsTour = tourActive && /^(please\s+)?(end|stop|finish|exit|cancel)(\s+the)?\s+(guided\s+)?tour[.!?]*$/i.test(content)
      || (tourActive && /^(ጉብኝቱን\s*(ጨርስ|አቁም))[።.!?]*$/u.test(content));
    if (endsTour) {
      tourActiveRef.current = false;
      setTourActive(false);
      setMessages(prev => [...prev,
        { role: "user", content, ts: Date.now() },
        { role: "assistant", content: t("ai.tourEnded"), ts: Date.now() },
      ]);
      return;
    }

    const userMsg: Message = { role: "user", content, ts: Date.now() };
    const requestHistoryKey = historyKey;
    const requestPath = pathname;
    const isTourRequest = options?.tourMode ?? tourActive;
    const next = [...visibleMessages, userMsg];
    setMessages(next);
    setLoading(true);

    // 1. Keep offline answers limited to neutral greeting/identity copy.
    const guideLanguage = (i18n.resolvedLanguage ?? i18n.language).startsWith("am") ? "am" : "en";
    if (!online) {
      const localAnswer = offlineAnswer(content, guideLanguage);
      setTimeout(() => {
        addMessage({
          role: "assistant",
          content: localAnswer ?? t("ai.offlineFallback"),
          offline: true,
          ts: Date.now(),
        }, requestHistoryKey);
        setLoading(false);
      }, 300); // small delay feels more natural
      return;
    }

    // The server chat endpoint requires authentication. Explain that clearly
    // instead of showing an unhelpful API fallback for guests.
    if (!user) {
      addMessage({ role: "assistant", content: t("ai.signInRequired"), ts: Date.now() }, requestHistoryKey);
      setLoading(false);
      return;
    }

    // 2. Send the conversation and minimal page/device context to the server.
    try {
      const { data } = await client.post("/api/ai/chat", {
        messages: next.slice(-20).map(m => ({ role: m.role, content: m.content })),
        context: {
          page: getGuidePage(pathname ?? "/"),
          viewport: getViewportClass(),
          language: guideLanguage,
          tourMode: isTourRequest,
        },
      });
      if (isTourRequest && (!tourActiveRef.current || previousPathname.current !== requestPath)) {
        setLoading(false);
        return;
      }
      addMessage({ role: "assistant", content: data.reply || data.text || "Sorry, I couldn't get a response.", ts: Date.now() }, requestHistoryKey);
      setLoading(false);
      return;
    } catch {
      // API failed — fall through to the localized fallback.
    }

    if (isTourRequest && (!tourActiveRef.current || previousPathname.current !== requestPath)) {
      setLoading(false);
      return;
    }

    // 3. API-failed fallback
    addMessage({
      role: "assistant",
      content: online
        ? t('ai.apiFallback')
        : t('ai.offlineFallback'),
      offline: true,
      ts: Date.now(),
    }, requestHistoryKey);
    setLoading(false);
  };

  const reset = () => {
    setMessages([]);
    localStorage.removeItem(historyKey);
  };

  const startTour = () => {
    if (!user || !online || loading) return;
    tourActiveRef.current = true;
    setTourActive(true);
    void sendMessage(t("ai.startTourRequest"), { tourMode: true });
  };

  const endTour = () => {
    tourActiveRef.current = false;
    setTourActive(false);
    addMessage({ role: "assistant", content: t("ai.tourEnded"), ts: Date.now() }, historyKey);
  };

  // AI Assistant is visible on ALL pages — including the showroom builder
  return (
    <>
      {/* Floating button — draggable */}
      <button
        ref={btnRef}
        onClick={() => {
          if (didDrag.current) { didDrag.current = false; return; }
          setOpen(value => !value);
        }}
        onPointerDown={handlePointerDown}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-5 md:bottom-6 md:right-6 z-[2147483647] touch-none rounded-full shadow-2xl shadow-blue-950/25 flex items-center justify-center gap-1.5 transition-transform duration-200 cursor-grab active:cursor-grabbing
          ${open ? "bg-slate-800 dark:bg-slate-700 rotate-6 scale-95"
            : "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 hover:scale-110 hover:shadow-blue-600/30 hover:shadow-xl"
          }`}
        style={btnStyle}
        title={t('ai.title') + ' (drag to move)'}
        aria-label={t('ai.title')}>
        {open ? <X className="w-5 h-5 text-white" /> : <AssistantFlipCoin />}
        {!open && visibleMessages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          data-testid="ai-assistant-panel"
          className="fixed bottom-40 right-4 md:bottom-20 md:right-6 z-[2147483647]
            w-[calc(100vw-2rem)] max-w-sm bg-blue-50 dark:bg-slate-900 border border-blue-300/80 dark:border-blue-500/35 rounded-2xl shadow-2xl shadow-slate-950/30
            flex flex-col overflow-hidden"
          style={{ ...(panelStyle.left !== undefined ? panelStyle : {}), height: "min(500px, calc(100dvh - 10.5rem))" }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-700 to-violet-700 shrink-0">
            <AssistantLogo size="sm" animated />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-none">{t('ai.title')}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {online
                  ? <><Wifi className="w-2.5 h-2.5 text-white/70" /><p className="text-white/70 text-[10px]">{t('ai.online')}</p></>
                  : <><WifiOff className="w-2.5 h-2.5 text-white/60" /><p className="text-white/60 text-[10px]">{t('ai.offlineMode')}</p></>
                }
              </div>
            </div>
            {tourActive && (
              <button
                onClick={endTour}
                title={t("ai.endTour")}
                aria-label={t("ai.endTour")}
                className="min-h-11 min-w-11 shrink-0 rounded-full border border-white/35 px-2 text-[11px] font-medium text-white hover:bg-white/10 transition-colors"
              >
                <span className="flex items-center justify-center gap-1.5"><Square className="h-3.5 w-3.5 shrink-0" /><span className="hidden sm:inline">{t("ai.endTour")}</span></span>
              </button>
            )}
            <button onClick={reset} title={t('ai.clearHistory')} aria-label={t('ai.clearHistory')} className="min-h-11 min-w-11 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} title={t('ai.close')} aria-label={t('ai.close')} className="min-h-11 min-w-11 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-blue-100/70 dark:bg-slate-900">
            {visibleMessages.length === 0 ? (
              /* Welcome screen */
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0"><AssistantLogo size="sm" animated /></span>
                  <div className="bg-white border border-blue-200/80 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%] shadow-sm dark:bg-slate-800 dark:border-blue-500/25">
                    <p className="text-sm text-slate-900 leading-relaxed dark:text-slate-100">
                      {t(user ? 'ai.welcomeMessage' : 'ai.welcomeGuest')}
                    </p>
                  </div>
                </div>
                <div className="pl-9 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="px-2.5 py-1 rounded-full border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-500/40 text-[11px] font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {user && online && (
                  <div className="pl-9">
                    <button
                      type="button"
                      onClick={startTour}
                      disabled={loading}
                      className="min-h-11 w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-left text-sm font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-50 disabled:opacity-50 dark:border-blue-500/40 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700"
                    >
                      <span className="flex items-center gap-2"><Compass className="h-4 w-4 shrink-0" />{t("ai.startTour")}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              visibleMessages.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "assistant" && (
                    <span className="mb-4 shrink-0"><AssistantLogo size="xs" /></span>
                  )}
                  <div className="flex flex-col gap-0.5" style={{ maxWidth: "80%", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-sm"
                        : "bg-white text-slate-900 border border-blue-200/80 rounded-bl-sm shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-blue-500/25"
                      }`}>
                      {m.content}
                    </div>
                    {/* Timestamp + offline badge */}
                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[10px] text-muted-foreground/60">{fmtTime(m.ts)}</span>
                      {m.offline && m.role === "assistant" && (
                        <span className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5">
                          <WifiOff className="w-2 h-2" /> {t('ai.offline')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-end gap-2">
                <span className="shrink-0"><AssistantLogo size="xs" animated /></span>
                <div className="bg-white border border-blue-200/80 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm dark:bg-slate-800 dark:border-blue-500/25">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 py-3 border-t border-blue-200/80 bg-white/95 dark:border-blue-500/25 dark:bg-slate-950 flex items-center gap-2">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={online ? t('ai.placeholder') : t('ai.placeholderOffline')}
              aria-label={online ? t('ai.placeholder') : t('ai.placeholderOffline')}
              disabled={loading}
              className="flex-1 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500/45 disabled:opacity-50 dark:bg-slate-900 dark:border-blue-500/30 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white disabled:opacity-40 hover:from-blue-700 hover:to-violet-700 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Keep the floating assistant mounted across routes so navigation does not
 * remove and recreate its animated launcher. */
export default function AiAssistant() {
  return <AiAssistantWidget />;
}
