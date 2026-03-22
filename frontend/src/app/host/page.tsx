"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventOverview } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { ZONE_LABELS } from "@/components/ZoneScroll";
import { supabase } from "@/lib/supabase";

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();

    // Supabase Realtime: debounce 500ms then refetch overview
    const channel = supabase
      .channel("host-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(load, 500);
        }
      )
      .subscribe();

    // 30s fallback poll
    const interval = setInterval(load, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

  if (!data) return (
    <main style={{ background: "var(--cream)", minHeight: "100dvh" }}>
      <TopBar title="Host Dashboard" subtitle="Encode Club AI London 2026" onBack={() => router.push("/")} right={<LiveDot />} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60dvh" }}>
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, marginBottom: 6 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 300, marginBottom: 16, lineHeight: 1.5 }}>
            Couldn't load the dashboard. Check your connection and try again.
          </div>
          <button
            onClick={() => { setLoading(true); load(); }}
            style={{
              padding: "10px 28px", borderRadius: 100, border: "none",
              background: "var(--green)", color: "#fff", cursor: "pointer",
              fontFamily: "var(--font-geist-sans), sans-serif", fontSize: 14, fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  );

  const zones = Object.entries(data.zone_counts).sort((a, b) => b[1] - a[1]);
  const hottestZone = zones[0];
  const activeNow = Object.entries(data.zone_counts)
    .filter(([z]) => z !== "unknown")
    .reduce((sum, [, c]) => sum + c, 0);
  const hasCheckins = Object.entries(data.zone_counts).some(([z, c]) => z !== "unknown" && c > 0);
  const isolatedAttendees = data.attendees.filter(
    (a) => a.zone && a.zone !== "unknown" && data.zone_counts[a.zone] === 1
  );

  // Build social graph from real attendee data using mutual_friend_ids
  const graphAttendees = data.attendees.slice(0, 12);
  const GRAPH_NODES = graphAttendees.map((a) => ({
    id: a.id,
    initials: getInitials(a.name),
  }));
  const nodeIndexById = Object.fromEntries(GRAPH_NODES.map((n, i) => [n.id, i]));
  const edgeSet = new Set<string>();
  const GRAPH_EDGES: [number, number][] = [];
  graphAttendees.forEach((a: AttendeeWithZone & { mutual_friend_ids?: string[] }, i) => {
    (a.mutual_friend_ids ?? []).forEach((friendId: string) => {
      const j = nodeIndexById[friendId];
      if (j !== undefined && j !== i) {
        const key = [Math.min(i, j), Math.max(i, j)].join("-");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          GRAPH_EDGES.push([i, j]);
        }
      }
    });
  });

  function SocialGraph() {
    const cx = 160, cy = 140, r = 110;
    const positions = GRAPH_NODES.map((_, i) => {
      const angle = (i / GRAPH_NODES.length) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });

    return (
      <svg viewBox="0 0 320 280" style={{ width: "100%", height: "auto" }}>
        {GRAPH_EDGES.map(([a, b], i) => (
          <line key={i}
            x1={positions[a].x} y1={positions[a].y}
            x2={positions[b].x} y2={positions[b].y}
            stroke="var(--card-border)" strokeWidth="1.5" opacity="0.7"
          />
        ))}
        {GRAPH_NODES.map((node, i) => {
          const pos = positions[i];
          const connCount = GRAPH_EDGES.filter(([a, b]) => a === i || b === i).length;
          const isHub = connCount >= 3;
          return (
            <g key={node.id}>
              <circle cx={pos.x} cy={pos.y} r={isHub ? 22 : 18}
                fill={isHub ? "var(--green)" : "var(--cream)"}
                stroke={isHub ? "var(--green)" : "var(--card-border)"}
                strokeWidth="1.5"
              />
              <text x={pos.x} y={pos.y - 3}
                textAnchor="middle" dominantBaseline="central"
                fontSize="10" fontWeight="600"
                fill={isHub ? "#fff" : "var(--text-2)"}
                fontFamily="var(--font-instrument-serif), serif"
              >
                {node.initials}
              </text>
              <text x={pos.x} y={pos.y + 10}
                textAnchor="middle" dominantBaseline="central"
                fontSize="7" fontWeight="400"
                fill={isHub ? "rgba(255,255,255,.7)" : "var(--text-3)"}
              >
                {connCount}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

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
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Active right now</div>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 32, marginTop: 4, lineHeight: 1 }}>{activeNow}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, fontWeight: 300 }}>{data.total_attendees} registered</div>
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
          {!hasCheckins ? (
            <div style={{ textAlign: "center", padding: "20px 12px" }}>
              <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 17, color: "var(--text-2)", marginBottom: 6 }}>
                No check-ins yet
              </div>
              <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.5, fontWeight: 300 }}>
                Once attendees start sharing their location, zone activity will appear here.
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Social graph */}
      <div style={{ padding: "4px 16px 14px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "var(--radius)", padding: 18 }}>
          <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, marginBottom: 14 }}>Social graph</div>
          <SocialGraph />
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
                  <button
                    onClick={() => router.push(`/tribe/${attendee.id}`)}
                    style={{
                      padding: "5px 14px", borderRadius: 100, border: "1px solid var(--card-border)",
                      background: "var(--card)", color: "var(--text)", cursor: "pointer",
                      fontFamily: "var(--font-geist-sans), sans-serif", fontSize: 11, fontWeight: 600,
                    }}
                  >
                    Go introduce
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
