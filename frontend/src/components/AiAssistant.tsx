// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, RotateCcw } from "lucide-react";
import client from "@/api/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How do I create a showroom?",
  "How do I post a task?",
  "Write a product description",
  "How does the referral program work?",
];

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const { data } = await client.post("/api/ai/chat", {
        messages: next.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Sorry, I couldn't get a response." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  const reset = () => setMessages([]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
          ${open ? "bg-slate-800 rotate-12 scale-95" : "bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-110"}`}
        style={{ width: 52, height: 52 }}
        title="Empire X AI"
        aria-label="Open AI assistant"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <Bot className="w-6 h-6 text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 right-4 md:bottom-20 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm
          bg-card border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 480 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-amber-500 to-orange-500 shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-none">Empire X AI</p>
              <p className="text-white/70 text-[10px] mt-0.5">Your smart assistant</p>
            </div>
            <button onClick={reset} title="Clear chat" className="p-1 text-white/70 hover:text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} className="p-1 text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-3 pt-2">
                {/* Welcome */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground leading-relaxed">
                      👋 Hi! I'm the <strong>Empire X AI</strong>. I can help you navigate the app, write descriptions, find products, and more. What can I do for you?
                    </p>
                  </div>
                </div>
                {/* Quick suggestions */}
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
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`px-3 py-2.5 rounded-2xl max-w-[80%] text-sm leading-relaxed
                    ${m.role === "user"
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-br-sm"
                      : "bg-secondary/60 text-foreground rounded-bl-sm"}`}>
                    {m.content}
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
              placeholder="Ask anything…"
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
