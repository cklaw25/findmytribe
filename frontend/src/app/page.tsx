"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLocation } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEMO_USERS = [
  { id: "usr_001", initials: "AP", name: "Aisha Patel",     role: "AI Engineer · DeepMind" },
  { id: "usr_002", initials: "JO", name: "James Okafor",    role: "Founder · Stealth" },
  { id: "usr_003", initials: "SM", name: "Sofia Marchetti", role: "ML Researcher · UCL" },
  { id: "usr_006", initials: "LF", name: "Luca Ferreira",   role: "Full Stack Dev · Freelance" },
  { id: "usr_015", initials: "OH", name: "Omar Hassan",     role: "Student · Imperial College" },
];

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"pick" | "register">("pick");
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_USERS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Registration form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [goals, setGoals] = useState("");

  async function handleDemoJoin() {
    if (!selectedId || loading) return;
    setLoading(true);
    try { await updateLocation(selectedId, "entrance"); } catch {}
    localStorage.setItem("fmt_user_id", selectedId);
    router.push(`/tribe/${selectedId}`);
  }

  async function handleRegister() {
    if (!name.trim() || !role.trim()) {
      setError("Name and role are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          company: company.trim(),
          bio: bio.trim() || `${role.trim()} at ${company.trim() || "this event"}.`,
          interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
          goals: goals.trim(),
        }),
      });
      if (!res.ok) throw new Error("Registration failed");
      const data = await res.json();
      const userId = data.id;
      try { await updateLocation(userId, "entrance"); } catch {}
      localStorage.setItem("fmt_user_id", userId);
      router.push(`/tribe/${userId}`);
    } catch (e) {
      setError("Couldn't register. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ background: "var(--cream)", minHeight: "100dvh", paddingBottom: 48 }}>
      {/* Wordmark */}
      <div style={{ textAlign: "center", padding: "48px 24px 8px" }}>
        <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 38, letterSpacing: "-.5px" }}>
          Find<em style={{ fontStyle: "italic", color: "var(--green)" }}>My</em>Tribe
        </div>
        <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 300, marginTop: 8, padding: "0 32px", lineHeight: 1.55 }}>
          Find your people. Right now. In this room.
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
          Encode Club AI London 2026
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, padding: "24px 16px 0" }}>
        {(["register", "pick"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 100, border: "1.5px solid",
              borderColor: mode === m ? "var(--green)" : "var(--card-border)",
              background: mode === m ? "var(--green)" : "var(--card)",
              color: mode === m ? "#fff" : "var(--text-2)",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              fontFamily: "var(--font-geist-sans), sans-serif",
            }}
          >
            {m === "register" ? "I'm new — register me" : "Use demo profile"}
          </button>
        ))}
      </div>

      {/* Register form */}
      {mode === "register" && (
        <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Your name *", value: name, set: setName, placeholder: "e.g. Alex Kim" },
            { label: "Role *", value: role, set: setRole, placeholder: "e.g. ML Engineer" },
            { label: "Company", value: company, set: setCompany, placeholder: "e.g. Google DeepMind" },
            { label: "Bio", value: bio, set: setBio, placeholder: "One line about what you're building or exploring" },
            { label: "Interests (comma-separated)", value: interests, set: setInterests, placeholder: "e.g. AI agents, startups, Python" },
            { label: "Goals for today", value: goals, set: setGoals, placeholder: "e.g. Find a co-founder, meet investors" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>
                {label}
              </div>
              <input
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10,
                  border: "1.5px solid var(--card-border)", background: "var(--card)",
                  fontSize: 14, color: "var(--text)", outline: "none",
                  fontFamily: "var(--font-geist-sans), sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}

          {error && (
            <div style={{ fontSize: 13, color: "var(--red-soft)", fontWeight: 500 }}>{error}</div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            style={{
              width: "100%", padding: "15px 0", fontSize: 15, fontWeight: 600,
              borderRadius: "var(--radius)", border: "none",
              background: "var(--green)", color: "#fff", cursor: "pointer",
              fontFamily: "var(--font-geist-sans), sans-serif",
              opacity: loading ? .7 : 1, marginTop: 4,
            }}
          >
            {loading ? "Building your tribe…" : "Find my tribe →"}
          </button>
        </div>
      )}

      {/* Demo picker */}
      {mode === "pick" && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)", padding: "20px 24px 12px" }}>
            Pick a demo profile
          </div>
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
          <div style={{ padding: "18px 16px 0" }}>
            <button
              onClick={handleDemoJoin}
              disabled={loading || !selectedId}
              style={{
                width: "100%", padding: "15px 20px", fontSize: 15, fontWeight: 600,
                borderRadius: "var(--radius)", border: "none",
                background: "var(--green)", color: "#fff", cursor: "pointer",
                fontFamily: "var(--font-geist-sans), sans-serif",
                opacity: loading ? .7 : 1,
              }}
            >
              {loading ? "Loading…" : "Find my tribe →"}
            </button>
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--text-3)" }}>
        <span onClick={() => router.push("/host")} style={{ cursor: "pointer", color: "var(--text-2)", fontWeight: 500 }}>
          View host dashboard
        </span>
      </div>
    </main>
  );
}
