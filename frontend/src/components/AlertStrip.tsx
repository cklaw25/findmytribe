"use client";

interface AlertStripProps {
  title: string;
  body: string;
  onDismiss: () => void;
}

export function AlertStrip({ title, body, onDismiss }: AlertStripProps) {
  return (
    <div style={{
      margin: "6px 16px 4px",
      background: "#F0EAD6",
      border: "1px solid #D8CCA8",
      borderRadius: "var(--radius-sm)",
      padding: "12px 14px",
      display: "flex", alignItems: "flex-start", gap: 10,
      animation: "slideDown .35s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "var(--amber)", flexShrink: 0, marginTop: 4,
        animation: "blink 1.6s ease-in-out infinite",
      }} />
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.48, color: "var(--text)" }}>
        <strong style={{ fontWeight: 600, display: "block", marginBottom: 1 }}>{title}</strong>
        {body}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none", border: "none", fontSize: 14,
          color: "var(--text-3)", cursor: "pointer", padding: "0 0 0 6px", lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
