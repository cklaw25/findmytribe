"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { getConnections, getLastMessage } from "@/lib/connections";
import { TopBar } from "@/components/TopBar";
import { TabBar } from "@/components/TabBar";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ChatInboxPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [connections] = useState(() => getConnections(userId));

  const rows = connections.map((conn) => {
    const last = getLastMessage(userId, conn.id);
    return { ...conn, lastMessage: last };
  });

  return (
    <div style={{ minHeight: "100svh", background: "var(--cream)", maxWidth: 480, margin: "0 auto", paddingBottom: 88 }}>
      <TopBar
        title="Messages"
        onBack={() => router.push(`/tribe/${userId}`)}
      />

      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-3)" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--card)", border: "1px solid var(--card-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 24,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, color: "var(--text)", marginBottom: 6 }}>
              No conversations yet
            </div>
            <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.5 }}>
              Connect with someone from your tribe to start chatting
            </div>
          </div>
        )}
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={() => router.push(`/tribe/${userId}/chat/${row.id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 4px", cursor: "pointer",
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: "var(--card)", border: "1px solid var(--card-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-instrument-serif), serif",
              fontSize: 17, color: "var(--green)",
            }}>
              {row.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{row.name}</div>
                {row.lastMessage && (
                  <div style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>
                    {timeAgo(row.lastMessage.timestamp)}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1, fontWeight: 300 }}>
                {row.role} · {row.company}
              </div>
              {row.lastMessage && (
                <div style={{
                  fontSize: 13, color: "var(--text-2)", marginTop: 3, fontWeight: 300,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {row.lastMessage.from === userId ? "You: " : ""}{row.lastMessage.text}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <TabBar active="chat" userId={userId} />
    </div>
  );
}
