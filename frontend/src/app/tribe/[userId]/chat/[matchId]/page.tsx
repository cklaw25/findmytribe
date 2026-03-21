"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { getConnections, getChatMessages, addChatMessage, type ChatMessage } from "@/lib/connections";
import { TopBar } from "@/components/TopBar";

export default function ChatThreadPage({ params }: { params: Promise<{ userId: string; matchId: string }> }) {
  const { userId, matchId } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const connection = getConnections(userId).find((c) => c.id === matchId);
  const matchName = connection?.name ?? "Chat";

  useEffect(() => {
    const existing = getChatMessages(userId, matchId);
    if (existing.length === 0) {
      // Seed welcome message
      const welcome: ChatMessage = {
        id: "system_welcome",
        from: "system",
        text: `You connected at Encode Club AI London! Start chatting with ${matchName}.`,
        timestamp: Date.now(),
      };
      addChatMessage(userId, matchId, welcome);
      setMessages([welcome]);
    } else {
      setMessages(existing);
    }
  }, [userId, matchId, matchName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      from: userId,
      text,
      timestamp: Date.now(),
    };
    const updated = addChatMessage(userId, matchId, msg);
    setMessages(updated);
    setInput("");
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <div style={{ minHeight: "100svh", background: "var(--cream)", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <TopBar
        title={matchName}
        subtitle={connection?.role}
        onBack={() => router.push(`/tribe/${userId}/chat`)}
      />

      {/* Messages */}
      <div style={{ flex: 1, padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
        {messages.map((msg) => {
          const isSelf = msg.from === userId;
          const isSystem = msg.from === "system";

          if (isSystem) {
            return (
              <div key={msg.id} style={{
                textAlign: "center", padding: "12px 20px",
                fontSize: 13, color: "var(--text-3)", fontWeight: 300,
                fontStyle: "italic", lineHeight: 1.5,
              }}>
                {msg.text}
              </div>
            );
          }

          return (
            <div key={msg.id} style={{
              display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start",
              alignItems: "flex-end", gap: 8,
            }}>
              {!isSelf && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "var(--card)", border: "1px solid var(--card-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-instrument-serif), serif",
                  fontSize: 11, color: "var(--text-2)",
                }}>
                  {getInitials(matchName)}
                </div>
              )}
              <div style={{
                maxWidth: "75%", padding: "10px 14px",
                borderRadius: isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: isSelf ? "var(--green)" : "var(--card)",
                color: isSelf ? "#fff" : "var(--text)",
                fontSize: 14, lineHeight: 1.5, fontWeight: 300,
                border: isSelf ? "none" : "1px solid var(--card-border)",
              }}>
                {msg.text}
                <div style={{
                  fontSize: 10, marginTop: 4,
                  color: isSelf ? "rgba(255,255,255,.6)" : "var(--text-3)",
                  textAlign: "right",
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(245,240,232,.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--card-border)",
        padding: "12px 16px max(14px,env(safe-area-inset-bottom))",
        maxWidth: 480, margin: "0 auto",
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 100,
              border: "1.5px solid var(--card-border)", background: "var(--card)",
              fontSize: 14, color: "var(--text)", outline: "none",
              fontFamily: "var(--font-geist-sans), sans-serif",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: input.trim() ? "var(--green)" : "var(--card-border)",
              border: "none", cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
