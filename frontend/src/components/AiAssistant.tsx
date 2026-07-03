// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Sparkles, RotateCcw, Wifi, WifiOff } from "lucide-react";
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

  const unreadCount = 0; // future: track unread replies

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
          ${open
            ? "bg-slate-700 dark:bg-slate-600 rotate-6 scale-95"
            : "bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-110 hover:shadow-amber-500/30 hover:shadow-xl"
          }`}
        style={{ width: 52, height: 52 }}
        title="Empire X AI"
        aria-label="Open AI assistant"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <Bot className="w-6 h-6 text-white" />
        }
        {/* Unread dot */}
        {!open && messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-36 right-4 md:bottom-20 md:right-6 z-50
            w-[calc(100vw-2rem)] max-w-sm bg-card border border-border/50 rounded-2xl shadow-2xl
            flex flex-col overflow-hidden"
          style={{ height: 500 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
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
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              /* Welcome screen */
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%]">
                    <p className="text-sm text-foreground leading-relaxed">
                      👋 Hi! I'm <strong>Empire X AI</strong>. I can help you with the app even when you're offline. What can I do for you?
                    </p>
                  </div>
                </div>
                <div className="pl-9 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="px-2.5 py-1 rounded-full border border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-700 text-[11px] font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
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
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 mb-4">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5" style={{ maxWidth: "80%", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === "user"
                        ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-br-sm"
                        : "bg-secondary/60 text-foreground rounded-bl-sm"
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
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-secondary/60 rounded-2xl rounded-bl-sm px-4 py-3">
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
          <div className="shrink-0 px-3 py-3 border-t border-border/40 flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={online ? "Ask anything…" : "Ask anything (offline mode)…"}
              disabled={loading}
              className="flex-1 bg-secondary/50 rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-amber-500/40 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white disabled:opacity-40 hover:from-amber-600 hover:to-amber-700 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
