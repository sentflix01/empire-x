'use client';
/**
 * OpsCopilot.tsx — Chat-driven operations panel for the DevOps console.
 *
 * Mirrors the AI-code-chat UX: message history, mode selector, slash-command
 * chips. Every message POSTs to /api/devops/copilot (admin-only) which parses
 * a whitelisted intent and executes it against the live platform, then the
 * assistant bubble renders the structured result.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Trash2, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import client from '@/api/client';

interface Msg { role: 'user' | 'assistant'; text: string; action?: string; at: number }

const QUICK = ['/health', '/errors 24', '/items', '/flags', '/telemetry', '/help'];

export default function OpsCopilot() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: '👋 Ops Copilot ready. Type a command or pick one below.\n\nTry `/help` to see everything I can do.', at: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'agent' | 'ask'>('agent');
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { role: 'user', text: msg, at: Date.now() }]);
    setInput('');
    setBusy(true);
    try {
      const { data } = await client.post('/api/devops/copilot', { message: msg, mode });
      setMessages((m) => [...m, { role: 'assistant', text: data.reply || '(empty)', action: data.action, at: Date.now() }]);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      setMessages((m) => [...m, {
        role: 'assistant',
        text: status === 403 ? '⛔ Admin access required.' : '⚠️ Execution failed — check the backend logs.',
        at: Date.now(),
      }]);
    } finally {
      setBusy(false);
    }
  }, [busy, mode]);

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: open ? 420 : undefined }}>
      {/* Header */}
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-600 shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Ops Copilot</p>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono bg-violet-500/10 text-violet-500 border-violet-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" /> live
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Command the platform from chat — flags, errors, backups, board</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {open && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 border-t border-border/30" style={{ maxHeight: 320 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-md'
                    : 'bg-secondary/60 border border-border/40 rounded-bl-md'
                }`}>
                  {m.action && m.role === 'assistant' && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase text-muted-foreground mb-1">
                      <Sparkles className="w-2.5 h-2.5" /> {m.action}
                    </span>
                  )}
                  <div>{m.text}</div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-secondary/60 border border-border/40 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Quick commands */}
          <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-border/30">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} disabled={busy}
                className="text-[10px] font-mono px-2 py-0.5 rounded-lg border border-border/40 bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors">
                {q}
              </button>
            ))}
          </div>

          {/* Composer row — mirrors the agent-chat layout */}
          <div className="px-4 py-3 flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'agent' | 'ask')}
              className="text-[11px] font-mono bg-secondary/50 border border-border/50 rounded-lg px-2 py-2 focus:outline-none"
              title="Agent executes commands · Ask only explains them"
            >
              <option value="agent">⚡ Agent</option>
              <option value="ask">💬 Ask</option>
            </select>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Plan, Build, / for commands…"
              disabled={busy}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-violet-500/60 font-mono disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMessages((m) => m.slice(0, 1))}
              className="w-9 h-9 rounded-xl bg-secondary/50 text-muted-foreground flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
