"use client";
import { useEffect, useState } from "react";

const DEFAULT_STEPS = [
  "Reading 47 attendee profiles...",
  "Scoring interest similarity...",
  "Checking mutual connections...",
  "Ranking compatibility...",
  "Generating conversation starters...",
  "Tribe list ready.",
];

const SKELETON_WIDTHS = [
  ["52%", "78%", "65%"],
  ["68%", "45%", "82%"],
  ["58%", "88%", "50%"],
];

interface LoadingScreenProps {
  steps?: string[];
  onComplete: () => void;
}

export function LoadingScreen({ steps = DEFAULT_STEPS, onComplete }: LoadingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (stepIndex >= steps.length - 1) {
      const t = setTimeout(onComplete, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setStepIndex((i) => i + 1);
        setFading(false);
      }, 220);
    }, 420);
    return () => clearTimeout(t);
  }, [stepIndex, steps, onComplete]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "92dvh", padding: "32px 28px", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        border: "2.5px solid var(--card-border)", borderTopColor: "var(--green)",
        animation: "spin .9s linear infinite", marginBottom: 26,
      }} />
      <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 24, marginBottom: 8 }}>
        Agent working
      </div>
      <div style={{
        fontSize: 14, color: "var(--text-2)", fontWeight: 300, minHeight: 22,
        opacity: fading ? 0 : 1, transition: "opacity .25s",
      }}>
        {steps[stepIndex]}
      </div>
      <div style={{
        width: 180, height: 3, background: "var(--card-border)", borderRadius: 2,
        overflow: "hidden", margin: "22px auto 0",
      }}>
        <div style={{
          height: "100%", background: "var(--green)", borderRadius: 2,
          animation: "prog 2.6s ease-out forwards",
        }} />
      </div>
      <div style={{ width: "100%", maxWidth: 340, marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
        {SKELETON_WIDTHS.map((widths, i) => (
          <div key={i} style={{
            background: "var(--card)", border: "1px solid var(--card-border)",
            borderRadius: "var(--radius)", padding: 16,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(90deg,var(--card-border) 25%,#ede8dd 50%,var(--card-border) 75%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
            }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
              {widths.map((w, j) => (
                <div key={j} style={{
                  height: 11, borderRadius: 5, width: w,
                  background: "linear-gradient(90deg,var(--card-border) 25%,#ede8dd 50%,var(--card-border) 75%)",
                  backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
