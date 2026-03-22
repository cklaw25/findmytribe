"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLocation } from "@/lib/api";

const DEMO_USERS = [
  { id: "usr_001", initials: "AP", name: "Aisha Patel",      role: "AI Engineer · DeepMind" },
  { id: "usr_002", initials: "JO", name: "James Okafor",     role: "Founder · Stealth" },
  { id: "usr_003", initials: "SM", name: "Sofia Marchetti",  role: "ML Researcher · UCL" },
  { id: "usr_006", initials: "LF", name: "Luca Ferreira",    role: "Full Stack Dev · Freelance" },
  { id: "usr_015", initials: "OH", name: "Omar Hassan",      role: "Student · Imperial College" },
];

export default function Home() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_USERS[0].id);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!selectedId || loading) return;
    setLoading(true);
    try {
      await updateLocation(selectedId, "entrance");
    } catch {
      // continue even if location update fails
    }
    localStorage.setItem("fmt_user_id", selectedId);
    router.push(`/tribe/${selectedId}`);
  }

  return (
    <main style={{ background: "var(--cream)", minHeight: "100dvh", paddingBottom: 40 }}>
      {/* Wordmark */}
      <div style={{ textAlign: "center", padding: "52px 24px 8px" }}>
        <div style={{
          fontFamily: "var(--font-instrument-serif), serif",
          fontSize: 38, letterSpacing: "-.5px",
        }}>
          Find<em style={{ fontStyle: "italic", color: "var(--green)" }}>My</em>Tribe
        </div>
        <div style={{ textAlign: "center", fontSize: 14, color: "var(--text-2)", fontWeight: 300, marginTop: 8, padding: "0 32px", lineHeight: 1.55 }}>
          Find your people. Right now. In this room.
        </div>
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11.5, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
          Encode Club AI London 2026
        </div>
      </div>

      {/* Profile picker label */}
      <div style={{ fontSize: 11.5, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)", padding: "28px 24px 14px" }}>
        Who are you today?
      </div>

      {/* Profile grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px" }}>
        {DEMO_USERS.map((user) => {
          const isSelected = selectedId === user.id;
          return (
            <div
              key={user.id}
              onClick={() => setSelectedId(user.id)}
              style={{
                background: isSelected ? "var(--green-lt)" : "var(--card)",
                border: `1.5px solid ${isSelected ? "var(--green)" : "var(--card-border)"}`,
                borderRadius: "var(--radius)", padding: "16px 14px",
                cursor: "pointer", transition: "all .2s",
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "var(--cream)", border: "1px solid var(--card-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-instrument-serif), serif",
                fontSize: 17, color: "var(--text-2)", marginBottom: 10,
              }}>
                {user.initials}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2, lineHeight: 1.3, fontWeight: 300 }}>
                {user.role}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA button */}
      <div style={{ padding: "22px 16px 0" }}>
        <button
          onClick={handleJoin}
          disabled={loading || !selectedId}
          style={{
            width: "100%", padding: "15px 20px", fontSize: 15, fontWeight: 600,
            borderRadius: "var(--radius)", border: "none",
            background: "var(--green)", color: "#fff", cursor: "pointer",
            fontFamily: "var(--font-geist-sans), sans-serif",
            opacity: loading ? .7 : 1, transition: "opacity .18s",
          }}
        >
          {loading ? "Loading…" : "Find my tribe"}
        </button>
      </div>

      {/* Host link */}
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "var(--text-3)" }}>
        <span
          onClick={() => router.push("/host")}
          style={{ cursor: "pointer", color: "var(--text-2)", fontWeight: 500 }}
        >
          View host dashboard
        </span>
      </div>
    </main>
  );
}
