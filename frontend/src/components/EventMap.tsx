"use client";
import { useEffect, useState } from "react";
import { TribeMatch, Zone, ZonePosition } from "@/types";

const ZONE_POSITIONS: Record<Zone, ZonePosition> = {
  entrance:  { x: 50, y: 85, label: "Entrance" },
  main_hall: { x: 50, y: 52, label: "Main Hall" },
  workshop:  { x: 78, y: 28, label: "Workshop" },
  chill_zone:{ x: 22, y: 28, label: "Chill Zone" },
  outside:   { x: 50, y: 8,  label: "Outside" },
  unknown:   { x: 50, y: 52, label: "" },
};

const AVATAR_COLORS = [
  "bg-violet-500", "bg-pink-500", "bg-amber-500",
  "bg-teal-500", "bg-emerald-500", "bg-rose-500",
];

function getDotColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

interface EventMapProps {
  tribeList: TribeMatch[];
  highlightId?: string | null;
}

export function EventMap({ tribeList, highlightId }: EventMapProps) {
  const [locations, setLocations] = useState<Record<string, Zone>>({});

  // Poll locations from backend every 5s (replace with Supabase realtime once keys are in)
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
        // silently fail — keep showing last known positions
      }
    }

    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden border border-gray-200">
      {/* Zone areas */}
      {(Object.entries(ZONE_POSITIONS) as [Zone, ZonePosition][])
        .filter(([zone]) => zone !== "unknown")
        .map(([zone, pos]) => (
          <div
            key={zone}
            className="absolute text-[10px] text-gray-400 font-medium select-none"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="bg-white/60 backdrop-blur px-2 py-0.5 rounded-full border border-gray-200">
              {pos.label}
            </div>
          </div>
        ))}

      {/* Connecting lines (decorative) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
        <line x1="50%" y1="85%" x2="50%" y2="52%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50%" y1="52%" x2="78%" y2="28%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50%" y1="52%" x2="22%" y2="28%" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50%" y1="52%" x2="50%" y2="8%"  stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
      </svg>

      {/* Tribe member dots */}
      {tribeList.map((person) => {
        const zone = (locations[person.id] as Zone) || "main_hall";
        const pos = ZONE_POSITIONS[zone];
        const isHighlighted = person.id === highlightId;

        // Slight jitter so dots don't overlap perfectly
        const jitterX = ((person.id.charCodeAt(4) || 0) % 10) - 5;
        const jitterY = ((person.id.charCodeAt(5) || 0) % 10) - 5;

        return (
          <div
            key={person.id}
            title={`${person.name} · ${pos.label}`}
            className={`absolute flex flex-col items-center transition-all duration-1000 cursor-pointer`}
            style={{
              left: `${pos.x + jitterX}%`,
              top: `${pos.y + jitterY}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`${getDotColor(person.id)} ${
                isHighlighted ? "w-10 h-10 ring-4 ring-yellow-400 ring-offset-1" : "w-8 h-8"
              } rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold transition-all`}
            >
              {person.name[0]}
            </div>
            {isHighlighted && (
              <span className="text-[10px] font-semibold text-gray-700 bg-white rounded-full px-1.5 shadow mt-0.5 whitespace-nowrap">
                {person.name.split(" ")[0]}
              </span>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur rounded-lg px-2 py-1 text-[10px] text-gray-500">
        {tribeList.length} people in your tribe
      </div>
    </div>
  );
}
