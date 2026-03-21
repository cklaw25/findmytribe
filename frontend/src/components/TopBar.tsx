import { ReactNode } from "react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function TopBar({ title, subtitle, onBack, right }: TopBarProps) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(245,240,232,.9)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--card-border)",
      padding: "14px 20px 13px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--card)", border: "1px solid var(--card-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, fontSize: 16, color: "var(--text-2)",
          }}
        >
          ←
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 19, lineHeight: 1 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontWeight: 300 }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
