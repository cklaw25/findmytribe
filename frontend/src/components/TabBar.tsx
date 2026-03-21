"use client";
import { useRouter } from "next/navigation";

type TabKey = "tribe" | "map" | "invitations" | "chat";

interface TabBarProps {
  active: TabKey;
  userId: string;
  onChange?: (tab: "tribe" | "map") => void;
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

export function TabBar({ active, userId, onChange }: TabBarProps) {
  const router = useRouter();

  function handleTab(tab: TabKey) {
    if (tab === active) return;
    if ((tab === "tribe" || tab === "map") && onChange) {
      onChange(tab);
    } else if (tab === "tribe") {
      router.push(`/tribe/${userId}`);
    } else if (tab === "map") {
      router.push(`/tribe/${userId}`);
    } else if (tab === "invitations") {
      router.push(`/tribe/${userId}/invitations`);
    } else if (tab === "chat") {
      router.push(`/tribe/${userId}/chat`);
    }
  }

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
      <button onClick={() => handleTab("tribe")} style={tabStyle(active === "tribe")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>My Tribe</span>
      </button>
      <button onClick={() => handleTab("map")} style={tabStyle(active === "map")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="18"/>
          <line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
        <span>Live Map</span>
      </button>
      <button onClick={() => handleTab("invitations")} style={tabStyle(active === "invitations")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
        <span>Invitations</span>
      </button>
      <button onClick={() => handleTab("chat")} style={tabStyle(active === "chat")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Chat</span>
      </button>
    </div>
  );
}
