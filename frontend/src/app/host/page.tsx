"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventOverview } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { ZONE_LABELS } from "@/components/ZoneScroll";

interface AttendeeWithZone {
  id: string;
  name: string;
  role: string;
  company: string;
  zone: string;
}

interface EventOverview {
  total_attendees: number;
  zone_counts: Record<string, number>;
  attendees: AttendeeWithZone[];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function LiveDot() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", animation: "blink 1.6s ease-in-out infinite" }} />
      <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--green)" }}>Live</span>
    </div>
  );
}

export default function HostDashboard() {
  const router = useRouter();
  const [data, setData] = useState<EventOverview | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const overview = await getEventOverview();
      setData(overview);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main style={{ background: "var(--cream)", minHeight: "100dvh" }}>
        <TopBar title="Host Dashboard" subtitle="Encode Club AI London 2026" right={<LiveDot />} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2.5px solid var(--card-border)", borderTopColor: "var(--green)", animation: "spin .9s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 300 }}>Loading dashboard…</div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const zones = Object.entries(data.zone_counts).sort((a, b) => b[1] - a[1]);
  const hottestZone = zones[0];
  const isolatedAttendees = data.attendees.filter(
    (a) => a.zone && a.zone !== "unknown" && data.zone_counts[a.zone] === 1
  );

  return (
    <main style={{ background: "var(--cream)", minHeight: "100dvh", paddingBottom: 32 }}>
      <TopBar
        title="Host Dashboard"
        subtitle="Encode Club AI London 2026"
        onBack={() => router.push("/")}
        right={<LiveDot />}
      />

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "16px 16px 10px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Attendees</div>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 32, marginTop: 4, lineHeight: 1 }}>{data.total_attendees}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, fontWeight: 300 }}>checked in today</div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Matches made</div>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 32, marginTop: 4, lineHeight: 1 }}>{Math.round(data.total_attendees * 2.6)}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, fontWeight: 300 }}>estimated total</div>
        </div>
        <div style={{ background: "#FAE8E0", border: "1px solid rgba(196,122,106,.2)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Isolated now</div>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 32, marginTop: 4, lineHeight: 1, color: "var(--red-soft)" }}>{isolatedAttendees.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, fontWeight: 300 }}>alone in zone</div>
        </div>
        <div style={{ background: "var(--green-lt)", border: "1px solid rgba(90,122,92,.2)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Hottest zone</div>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, marginTop: 8, lineHeight: 1, color: "var(--green)" }}>
            {hottestZone ? (ZONE_LABELS[hottestZone[0]] ?? hottestZone[0]) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, fontWeight: 300 }}>
            {hottestZone ? `${hottestZone[1]} people now` : ""}
          </div>
        </div>
      </div>

      {/* Zone heatmap */}
      <div style={{ padding: "4px 16px 14px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: 18 }}>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, marginBottom: 14 }}>Zone heatmap</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {zones.map(([zone, count]) => (
              <div key={zone} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-2)", width: 74, flexShrink: 0 }}>
                  {ZONE_LABELS[zone] ?? zone}
                </div>
                <div style={{ flex: 1, height: 22, background: "var(--cream)", borderRadius: 5, overflow: "hidden", border: "1px solid var(--card-border)" }}>
                  <div style={{
                    height: "100%", borderRadius: 5, minWidth: 28,
                    background: "linear-gradient(90deg,var(--green-mid),var(--green))",
                    width: `${Math.round((count / data.total_attendees) * 100)}%`,
                    display: "flex", alignItems: "center", justifyContent: "flex-end",
                    paddingRight: 8, fontSize: 11, fontWeight: 600, color: "#fff",
                    transition: "width 1.1s cubic-bezier(.22,1,.36,1)",
                  }}>
                    {count}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, width: 20, textAlign: "right", color: "var(--text-2)" }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Isolated attendees */}
      {isolatedAttendees.length > 0 && (
        <div style={{ padding: "4px 16px 14px" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: 18 }}>
            <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, marginBottom: 14 }}>Isolated attendees</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {isolatedAttendees.map((attendee) => (
                <div key={attendee.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: "var(--cream)", border: "1px solid var(--card-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-instrument-serif), serif",
                    fontSize: 13, color: "var(--text-2)",
                  }}>
                    {getInitials(attendee.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{attendee.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 300 }}>
                      {ZONE_LABELS[attendee.zone] ?? attendee.zone} · alone
                    </div>
                  </div>
                  <button style={{
                    padding: "5px 14px", borderRadius: 100, border: "1px solid var(--card-border)",
                    background: "var(--card)", color: "var(--text)", cursor: "pointer",
                    fontFamily: "var(--font-geist-sans), sans-serif", fontSize: 11, fontWeight: 600,
                  }}>
                    Introduce
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All attendees */}
      <div style={{ padding: "4px 16px 14px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18 }}>All attendees</div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-3)", background: "var(--cream)", border: "1px solid var(--card-border)", padding: "2px 10px", borderRadius: 100 }}>
              {data.total_attendees} people
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {data.attendees.map((attendee) => (
              <div key={attendee.id} style={{
                background: "var(--cream)", border: "1px solid var(--card-border)",
                borderRadius: "var(--radius-sm)", padding: "11px 12px",
                display: "flex", alignItems: "center", gap: 9,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "var(--card)", border: "1px solid var(--card-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-instrument-serif), serif",
                  fontSize: 13, color: "var(--text-2)",
                }}>
                  {getInitials(attendee.name)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
                    {attendee.name.split(" ")[0]} {attendee.name.split(" ")[1]?.[0]}.
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 300 }}>
                    {ZONE_LABELS[attendee.zone] ?? attendee.zone ?? "Unknown"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
