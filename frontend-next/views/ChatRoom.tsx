// @ts-nocheck
'use client';
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from 'next/navigation';
import { entities } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { createNotification } from "@/lib/notifications";
import { useTranslation } from 'react-i18next';
import { getSocket } from "@/lib/socket";

import { ArrowLeft, Send, Radio, Users, MoreVertical, Paperclip, Smile } from "lucide-react";
import moment from "moment";

const TG_BLUE = "#0088cc";
const TG_BLUE_LIGHT = "#effdde";

function ChatRoom() {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth(); // Fix #5: use shared auth context instead of direct auth.me() call
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    entities.Conversation.get(id).then(setConversation).catch(() => {});
    loadMessages();

    // Fix #5: use shared socket singleton instead of creating a new one per mount
    const socket = getSocket();
    const freshToken = typeof window !== 'undefined' ? localStorage.getItem("access_token") || "" : "";
    (socket as any).auth = { token: freshToken };
    if (!socket.connected) socket.connect();

    socket.emit("join_conversation", id);
    const onNewMessage = (msg: any) => {
      if (msg.conversation_id === id) {
        setMessages((prev: any[]) => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    };
    socket.on("new_message", onNewMessage);
    // Only poll as fallback when socket is disconnected
    const fallback = setInterval(() => {
      if (!socket.connected) loadMessages();
    }, 30000);
    return () => {
      socket.emit("leave_conversation", id);
      socket.off("new_message", onNewMessage); // Fix #5: remove only this listener, not all
      clearInterval(fallback);
      // Don't disconnect — socket is shared singleton
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const data = await entities.Message.filter({ conversation_id: id }, "created_at", 200);
    setMessages(data);
  };

  const getDisplayName = () => {
    if (conversation?.type === "group" || conversation?.type === "channel") {
      return conversation.name || (conversation.type === "channel" ? "Channel" : "Group");
    }
    if (!conversation?.participant_names) return "Chat";
    try {
      const names = JSON.parse(conversation.participant_names);
      const ids = JSON.parse(conversation.participant_ids);
      const idx = ids.indexOf(user?.id);
      return names[idx === 0 ? 1 : 0] || names[0] || "Chat";
    } catch { return "Chat"; }
  };

  const getSubtitle = () => {
    if (!conversation) return "";
    if (conversation.type === "channel") return `${getSubscriberCount()} subscriber${getSubscriberCount() !== 1 ? "s" : ""}`;
    if (conversation.type === "group") return `${getMemberCount()} member${getMemberCount() !== 1 ? "s" : ""}`;
    return "last seen recently";
  };

  const getMemberCount = () => {
    try { return JSON.parse(conversation.participant_ids || "[]").length; } catch { return 0; }
  };

  const getSubscriberCount = () => {
    try { return JSON.parse(conversation.participant_ids || "[]").length; } catch { return 0; }
  };

  const isAdmin = conversation?.admin_id === user?.id;
  const isChannel = conversation?.type === "channel";
  const isGroup = conversation?.type === "group";

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    await entities.Message.create({
      conversation_id: id,
      sender_id: user?.id || "",
      sender_name: user?.full_name || "You",
      content: msg,
    });
    // Fix #14: backend already updates last_message on POST /conversations/:id/messages
    // No need to call Conversation.update() here — it would fail for non-admin group chats
    try {
      const ids = JSON.parse(conversation?.participant_ids || "[]");
      const otherIds = ids.filter((pid: string) => pid !== user?.id);
      for (const otherId of otherIds) {
        await createNotification(otherId, "message", `New message from ${user?.full_name || "someone"}`, msg, `/messages/${id}`);
      }
    } catch {}
    setSending(false);
  };

  // Group messages by date
  const groupedMessages = (() => {
    const groups = {};
    messages.forEach(msg => {
    const dateKey = moment(msg.created_at).format("YYYY-MM-DD");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return Object.entries(groups);
  })();

  const formatDateLabel = (dateKey) => {
    const msgDate = moment(dateKey);
    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "day").startOf("day");
    if (msgDate.isSame(today, "day")) return "Today";
    if (msgDate.isSame(yesterday, "day")) return "Yesterday";
    return msgDate.format("MMMM D");
  };

  const avatarLetter = getDisplayName().charAt(0).toUpperCase();
  const avatarColor = isChannel ? TG_BLUE : isGroup ? "#4CAF50" : TG_BLUE;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Telegram-style Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm z-10"
        style={{ backgroundColor: TG_BLUE }}
      >
        <button onClick={() => router.push("/messages")} className="p-1 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
          {isChannel ? <Radio className="w-5 h-5" /> : isGroup ? <Users className="w-5 h-5" /> : avatarLetter}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{getDisplayName()}</p>
          <p className="text-xs text-white/70">{getSubtitle()}</p>
        </div>
        <button className="p-1 rounded-full hover:bg-white/10 transition-colors">
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Messages Area - Telegram chat background */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
        style={{
          backgroundColor: "#cfd7dc",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%239eabae' fill-opacity='0.15'%3E%3Cpath d='M14 16c-2 0-4 2-4 4v16c0 4 3 7 7 7h7c1 0 2 1 2 2v5l5-5c1-1 2-2 4-2h6c4 0 7-3 7-7V20c0-2-2-4-4-4H14z'/%3E%3Ccircle cx='60' cy='20' r='3'/%3E%3Ccircle cx='65' cy='55' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {groupedMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="bg-black/10 backdrop-blur-sm rounded-2xl px-6 py-3 text-center">
              <p className="text-sm text-foreground">
                {isChannel ? "No messages yet. Share your first broadcast!" : "No messages yet. Say hello!"}
              </p>
            </div>
          </div>
        )}

        {groupedMessages.map(([dateKey, msgs]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <div className="flex justify-center my-3">
              <span className="bg-black/10 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1 rounded-full">
                {formatDateLabel(dateKey)}
              </span>
            </div>

            {/* Messages */}
            {msgs.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              const prevMsg = msgs[idx - 1];
              const showSender = (isGroup || isChannel) && !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} mb-0.5`}
                >
                  <div
                    className={`relative max-w-[80%] px-3 py-1.5 text-sm ${
                      isMe
                        ? "rounded-2xl rounded-br-md text-foreground"
                        : "rounded-2xl rounded-bl-md text-foreground bg-card shadow-sm"
                    }`}
                    style={isMe ? { backgroundColor: TG_BLUE_LIGHT } : {}}
                  >
                    {showSender && (
                      <p className="text-xs font-semibold mb-0.5" style={{ color: TG_BLUE }}>
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    <div className="flex items-center justify-end gap-0.5 mt-0.5 -mb-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {moment(msg.created_at).format("HH:mm")}
                      </span>
                      {isMe && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 11" fill="none">
                          <path d="M1 5.5L4 8.5L11 1.5" stroke={TG_BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 5.5L8 8.5L15 1.5" stroke={TG_BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar - Telegram style */}
      {isChannel && !isAdmin ? (
        <div className="bg-card border-t border-border/30 px-4 py-4 flex items-center justify-center shrink-0">
          <p className="text-sm text-muted-foreground">🔊 You're a subscriber. Only admins can post.</p>
        </div>
      ) : (
        <div className="bg-card border-t border-border/30 px-3 py-2 flex items-end gap-2 shrink-0 md:mb-0">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 bg-secondary rounded-2xl px-4 py-2 flex items-center">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isChannel ? "Broadcast a message..." : "Message"}
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none resize-none max-h-24 self-center"
              style={{ minHeight: "20px" }}
            />
          </div>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors shrink-0">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-30 shrink-0 transition-transform active:scale-90"
            style={{ backgroundColor: TG_BLUE }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}



export default ChatRoom;
