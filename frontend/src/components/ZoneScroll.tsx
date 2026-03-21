"use client";

export const ZONE_LABELS: Record<string, string> = {
  entrance:   "Entrance",
  main_hall:  "Main Hall",
  workshop:   "Workshop",
  chill_zone: "Chill Zone",
  outside:    "Outside",
};

interface ZoneScrollProps {
  activeZone: string;
  onChange: (zone: string) => void;
}

export function ZoneScroll({ activeZone, onChange }: ZoneScrollProps) {
  return (
    <div style={{
      padding: "12px 16px 8px", display: "flex", gap: 7,
      overflowX: "auto", scrollbarWidth: "none",
    }}>
      {Object.entries(ZONE_LABELS).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            flexShrink: 0, padding: "9px 18px", borderRadius: 100,
            fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
            minHeight: 44,
            border: `1.5px solid ${activeZone === key ? "var(--text)" : "var(--card-border)"}`,
            background: activeZone === key ? "var(--text)" : "var(--card)",
            color: activeZone === key ? "var(--cream)" : "var(--text-2)",
            fontFamily: "var(--font-geist-sans), sans-serif",
            transition: "all .15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
