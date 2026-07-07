'use client';

// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, Send, RotateCcw, Wifi, WifiOff } from "lucide-react";
import client from "@/api/client";
import { offlineAnswer, isOnline } from "@/lib/aiOffline";

interface Message {
  role: "user" | "assistant";
  content: string;
  offline?: boolean; // true if answered by local engine
  ts: number;        // timestamp for display
}

const STORAGE_KEY = "empire_ai_history";
const MAX_STORED = 60; // keep last 60 messages in localStorage

const SUGGESTIONS = [
  "How do I create a showroom?",
  "How do I post a task?",
  "How does the referral program work?",
  "How do I sell a product?",
];

function AssistantLogo({ size = "sm", animated = false }: { size?: "xs" | "sm" | "md"; animated?: boolean }) {
  const sizeClass = size === "md" ? "w-11 h-11" : size === "sm" ? "w-7 h-7" : "w-6 h-6";
  const imageClass = size === "md" ? "w-9 h-9" : size === "sm" ? "w-5 h-5" : "w-4 h-4";

  return (
    <span
      className={`${sizeClass} ai-logo-orb ${animated ? "ai-logo-orb-active" : ""} relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-white/35`}
      aria-hidden="true"
    >
      <Image
        src="/brand/empire-x-logo.png"
        alt=""
        width={44}
        height={44}
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
          <Image
            src="/brand/empire-x-logo.png"
            alt=""
            width={48}
            height={48}
            className="h-10 w-10 rounded-full object-cover"
          />
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
function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save messages to localStorage, keeping the last MAX_STORED */
function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
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

export default function AiAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadHistory());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(() => isOnline());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track online/offline
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Persist history whenever messages change
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Scroll to bottom on new messages or open
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    // 1. Try offline rule engine first (instant, no network needed)
    const localAnswer = offlineAnswer(content);
    if (localAnswer) {
      setTimeout(() => {
        addMessage({ role: "assistant", content: localAnswer, offline: true, ts: Date.now() });
        setLoading(false);
      }, 300); // small delay feels more natural
      return;
    }

    // 2. If online, try the API
    if (online) {
      try {
        const { data } = await client.post("/api/ai/chat", {
          messages: next.map(m => ({ role: m.role, content: m.content })),
        });
        addMessage({ role: "assistant", content: data.reply || "Sorry, I couldn't get a response.", ts: Date.now() });
        setLoading(false);
        return;
      } catch {
        // API failed — fall through to offline fallback
      }
    }

    // 3. Offline/API-failed fallback
    addMessage({
      role: "assistant",
      content: online
        ? "⚠️ I couldn't reach the AI service right now. Try asking something else — I can answer many questions about Empire X without internet!"
        : "📶 You appear to be offline. I can still answer common questions about Empire X — try asking how to create a showroom, post a task, use the referral program, and more!",
      offline: true,
      ts: Date.now(),
    });
    setLoading(false);
  };

  const reset = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hideOnPreviewPages = pathname === "/showroom/create" || pathname.startsWith("/showroom/samples");
  if (hideOnPreviewPages) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-24 right-5 md:bottom-6 md:right-6 z-[2147483647] rounded-full shadow-2xl shadow-blue-950/25 flex items-center justify-center gap-1.5 transition-all duration-200
          ${open
            ? "bg-slate-800 dark:bg-slate-700 rotate-6 scale-95"
            : "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 hover:scale-110 hover:shadow-blue-600/30 hover:shadow-xl"
          }`}
        style={{ width: 56, height: 56, paddingInline: 0 }}
        title="Empire X AI"
        aria-label="Open AI assistant"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <AssistantFlipCoin />
        }
        {/* Unread dot */}
        {!open && messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-40 right-4 md:bottom-20 md:right-6 z-[2147483647]
            w-[calc(100vw-2rem)] max-w-sm bg-blue-50 dark:bg-slate-900 border border-blue-300/80 dark:border-blue-500/35 rounded-2xl shadow-2xl shadow-slate-950/30
            flex flex-col overflow-hidden"
          style={{ height: "min(500px, calc(100dvh - 10.5rem))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-700 to-violet-700 shrink-0">
            <AssistantLogo size="sm" animated />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-none">Empire X AI</p>
              <div className="flex items-center gap-1 mt-0.5">
                {online
                  ? <><Wifi className="w-2.5 h-2.5 text-white/70" /><p className="text-white/70 text-[10px]">Online</p></>
                  : <><WifiOff className="w-2.5 h-2.5 text-white/60" /><p className="text-white/60 text-[10px]">Offline mode</p></>
                }
              </div>
            </div>
            <button onClick={reset} title="Clear history" className="p-1 text-white/70 hover:text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} className="p-1 text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-blue-100/70 dark:bg-slate-900">
            {messages.length === 0 ? (
              /* Welcome screen */
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0"><AssistantLogo size="sm" animated /></span>
                  <div className="bg-white border border-blue-200/80 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%] shadow-sm dark:bg-slate-800 dark:border-blue-500/25">
                    <p className="text-sm text-slate-900 leading-relaxed dark:text-slate-100">
                      👋 Hi! I'm <strong>Empire X AI</strong>. I can help you with the app even when you're offline. What can I do for you?
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
              </div>
            ) : (
              messages.map((m, i) => (
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
                          <WifiOff className="w-2 h-2" /> offline
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
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={online ? "Ask anything…" : "Ask anything (offline mode)…"}
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
