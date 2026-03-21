"use client";

interface TabBarProps {
  active: "tribe" | "map";
  onChange: (tab: "tribe" | "map") => void;
}

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1, padding: "9px 6px", border: "none",
  background: isActive ? "var(--card)" : "transparent",
  cursor: "pointer", borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-geist-sans), sans-serif",
  fontSize: 11.5, fontWeight: isActive ? 600 : 500,
  color: isActive ? "var(--text)" : "var(--text-3)",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  transition: "all .18s",
});

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(245,240,232,.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid var(--card-border)",
      padding: "10px 20px max(14px,env(safe-area-inset-bottom))",
      display: "flex", gap: 6,
    }}>
      <button onClick={() => onChange("tribe")} style={tabStyle(active === "tribe")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>My Tribe</span>
      </button>
      <button onClick={() => onChange("map")} style={tabStyle(active === "map")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="18"/>
          <line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
        <span>Live Map</span>
      </button>
    </div>
  );
}
