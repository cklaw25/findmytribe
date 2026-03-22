"use client";

interface AlertStripProps {
  title: string;
  body: string;
  onDismiss: () => void;
  onTap?: () => void;
}

export function AlertStrip({ title, body, onDismiss, onTap }: AlertStripProps) {
  return (
    <div
      onClick={onTap}
      style={{
        margin: "0 12px",
        marginTop: "max(10px, env(safe-area-inset-top))",
        background: "#F0EAD6",
        border: "1px solid #D8CCA8",
        borderRadius: "var(--radius-sm)",
        padding: "13px 14px",
        display: "flex", alignItems: "flex-start", gap: 10,
        animation: "slideDown .35s cubic-bezier(.22,1,.36,1)",
        boxShadow: "0 4px 24px rgba(90,80,60,.18)",
        cursor: onTap ? "pointer" : "default",
      }}>
      {/* Pulsing dot — this is the "unprompted" visual signal */}
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: "var(--amber)", flexShrink: 0, marginTop: 3,
        animation: "blink 1s ease-in-out infinite",
      }} />
      <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.48, color: "var(--text)" }}>
        <strong style={{ fontWeight: 700, display: "block", marginBottom: 2 }}>{title}</strong>
        {body}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none", border: "none", fontSize: 15,
          color: "var(--text-3)", cursor: "pointer", padding: "0 0 0 6px",
          lineHeight: 1, flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
