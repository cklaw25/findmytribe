"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { TribeMatch, Zone } from "@/types";

// Zone regions (matching HTML prototype geometry)
const ZONE_REGIONS: { key: string; label: string; style: React.CSSProperties }[] = [
  { key: "entrance",   label: "Entrance",   style: { top: "2%",  left: "2%",  width: "44%", height: "16%", background: "rgba(240,235,220,.6)" } },
  { key: "main_hall",  label: "Main Hall",  style: { top: "20%", left: "2%",  width: "60%", height: "42%", background: "rgba(220,232,220,.5)" } },
  { key: "workshop",   label: "Workshop",   style: { top: "20%", left: "64%", width: "34%", height: "42%", background: "rgba(232,226,248,.45)" } },
  { key: "chill_zone", label: "Chill Zone", style: { top: "64%", left: "2%",  width: "44%", height: "30%", background: "rgba(222,242,232,.45)" } },
  { key: "outside",    label: "Outside",    style: { top: "64%", left: "48%", width: "50%", height: "30%", background: "rgba(248,230,224,.4)" } },
];

// Centre points for dot placement (% of canvas)
const ZONE_CENTRES: Record<string, { cx: number; cy: number }> = {
  entrance:   { cx: 24, cy: 9  },
  main_hall:  { cx: 32, cy: 41 },
  workshop:   { cx: 81, cy: 41 },
  chill_zone: { cx: 24, cy: 79 },
  outside:    { cx: 73, cy: 79 },
  unknown:    { cx: 32, cy: 41 },
};

// Deterministic jitter so dots don't perfectly overlap
function jitter(seed: string, range: number) {
  const n = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((n % (range * 2 + 1)) - range);
}

interface EventMapProps {
  tribeList: TribeMatch[];
  highlightId?: string | null;
  selfZone?: Zone;
}

export function EventMap({ tribeList, highlightId, selfZone = "entrance" }: EventMapProps) {
  const [locations, setLocations] = useState<Record<string, Zone>>({});
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    async function fetchLocations() {
      try {
        const res = await fetch(`${apiUrl}/locations`);
        const data = await res.json();
        const map: Record<string, Zone> = {};
        for (const loc of data) {
          map[loc.user_id] = loc.zone;
        }
        setLocations(map);
      } catch {
        // keep last known positions
      }
    }

    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  const tribeIds = new Set(tribeList.map((p) => p.id));

  // Collect all dots: self + tribe members
  const dots = tribeList.map((person) => {
    const zone = (locations[person.id] as Zone) || "main_hall";
    const centre = ZONE_CENTRES[zone] || ZONE_CENTRES.unknown;
    const isHighlighted = person.id === highlightId;
    return {
      id: person.id,
      initials: person.name.split(" ").map((n) => n[0]).join("").slice(0, 2),
      firstName: person.name.split(" ")[0],
      left: centre.cx + jitter(person.id + "x", 6),
      top:  centre.cy + jitter(person.id + "y", 4),
      isTribe: tribeIds.has(person.id),
      isHighlighted,
    };
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  // Self dot
  const selfCentre = ZONE_CENTRES[selfZone] || ZONE_CENTRES.entrance;
  const selfDot = {
    left: selfCentre.cx + jitter("self_x", 4),
    top:  selfCentre.cy + jitter("self_y", 3),
  };

  return (
    <div>
      {/* Map canvas */}
      <div style={{
        margin: "14px 16px 12px", borderRadius: "var(--radius)", overflow: "hidden",
        border: "1px solid var(--card-border)", boxShadow: "var(--shadow)",
        aspectRatio: "1 / 1.05", background: "#FDFAF4", position: "relative",
      }}>
        {/* Zone regions */}
        {ZONE_REGIONS.map((zone) => (
          <div key={zone.key} style={{
            position: "absolute", borderRadius: 10,
            border: "1.5px dashed rgba(90,80,60,.14)",
            display: "flex", alignItems: "flex-start",
            padding: "8px 10px",
            fontSize: 10.5, fontWeight: 500,
            color: "rgba(90,80,60,.45)",
            letterSpacing: ".03em", textTransform: "uppercase",
            ...zone.style,
          }}>
            {zone.label}
          </div>
        ))}

        {/* Empty state overlay */}
        {tribeList.length === 0 && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            background: "rgba(253, 250, 244, 0.85)",
            borderRadius: "var(--radius)",
            padding: "32px 28px",
            textAlign: "center",
            maxWidth: "80%",
          }}>
            <h3 style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontSize: 22,
              fontWeight: 400,
              color: "var(--text)",
              margin: "0 0 8px",
            }}>
              Be the first to check in!
            </h3>
            <p style={{
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--text-2)",
              margin: 0,
            }}>
              Once attendees start sharing their location, you will see them appear on the map.
            </p>
          </div>
        )}

        {/* Self dot */}
        <div style={{
          position: "absolute",
          left: `${selfDot.left}%`, top: `${selfDot.top}%`,
          transform: "translate(-50%,-50%)", zIndex: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            border: "2.5px solid #fff", boxShadow: "0 2px 10px rgba(0,0,0,.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: 11, color: "#fff", background: "var(--text)",
            animation: "selfring 2.2s ease-out infinite",
          }}>
            Me
          </div>
        </div>

        {/* Tribe + other dots */}
        {dots.map((dot) => (
          <div key={dot.id} ref={dot.isHighlighted ? highlightRef : undefined} style={{
            position: "absolute",
            left: `${dot.left}%`, top: `${dot.top}%`,
            transform: "translate(-50%,-50%)",
            transition: "left .75s cubic-bezier(.22,1,.36,1), top .75s cubic-bezier(.22,1,.36,1)",
            cursor: "pointer", zIndex: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              border: "2.5px solid #fff", boxShadow: "0 2px 10px rgba(0,0,0,.14)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-instrument-serif), serif",
              fontSize: 11, color: "#fff",
              background: dot.isHighlighted ? "#E85D4A" : dot.isTribe ? "var(--green)" : "#BEB5A8",
              animation: dot.isHighlighted ? "highlightring 1.4s ease-out infinite" : undefined,
            }}>
              {dot.initials}
            </div>
            {dot.isHighlighted && (
              <div style={{
                position: "absolute", bottom: -17, left: "50%",
                transform: "translateX(-50%)",
                fontSize: 9.5, fontWeight: 500, whiteSpace: "nowrap",
                color: "var(--text-2)",
              }}>
                {dot.firstName}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "0 20px 10px", fontSize: 12, color: "var(--text-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--text)" }} />
          You
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)" }} />
          Your tribe
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#BEB5A8" }} />
          Others
        </div>
      </div>

      {/* Zone occupancy chips */}
      <ZoneChips locations={locations} />
    </div>
  );
}

function ZoneChips({ locations }: { locations: Record<string, Zone> }) {
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const zone of Object.values(locations)) {
      counts[zone] = (counts[zone] || 0) + 1;
    }
    return counts;
  }, [locations]);

  return (
    <div style={{
      display: "flex", gap: 8, padding: "4px 16px 14px",
      overflowX: "auto", WebkitOverflowScrolling: "touch",
    }}>
      {ZONE_REGIONS.map((zone) => (
        <div key={zone.key} style={{
          background: "var(--card)", border: "1px solid var(--card-border)",
          borderRadius: "var(--radius-sm)", padding: "10px 14px",
          minWidth: 80, textAlign: "center", flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 500, textTransform: "uppercase",
            letterSpacing: ".06em", color: "var(--text-3)",
          }}>
            {zone.label}
          </div>
          <div style={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: 26, lineHeight: 1.2, marginTop: 2,
          }}>
            {zoneCounts[zone.key] || 0}
          </div>
        </div>
      ))}
    </div>
  );
}
