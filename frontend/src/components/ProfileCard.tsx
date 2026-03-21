"use client";
import { TribeMatch } from "@/types";

interface ProfileCardProps {
  profile: TribeMatch;
  onViewMap?: () => void;
  onConnect?: (e: React.MouseEvent) => void;
  expanded?: boolean;
  isOnline?: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getMatchBadge(score: number) {
  const style: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, padding: "3px 10px",
    borderRadius: 100, border: "1px solid transparent",
    background: "var(--green-lt)", color: "var(--green)",
    borderColor: "rgba(90,122,92,.2)",
  };
  return <span style={style}>{score}% match</span>;
}

function getSourceBadge(source: string) {
  if (source === "mutual_friend") {
    return (
      <span style={{
        fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 100,
        border: "1px solid rgba(112,96,160,.18)", background: "#EDE8FA", color: "#7060A0",
      }}>
        Mutual connection
      </span>
    );
  }
  return null;
}

function getTypeBadge(matchType: string) {
  const isFounder = matchType?.toLowerCase().includes("founder") || matchType?.toLowerCase().includes("investor");
  if (isFounder) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 100,
        border: "1px solid rgba(196,122,106,.2)", background: "#FAE8E0", color: "var(--red-soft)",
      }}>
        {matchType}
      </span>
    );
  }
  if (matchType) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 100,
        border: "1px solid var(--card-border)", background: "var(--cream)", color: "var(--text-2)",
      }}>
        {matchType}
      </span>
    );
  }
  return null;
}

export function ProfileCard({ profile, onViewMap, onConnect, expanded = false, isOnline }: ProfileCardProps) {
  return (
    <div style={{
      background: "var(--card)",
      border: `1.5px solid ${expanded ? "var(--green-mid)" : "var(--card-border)"}`,
      borderRadius: "var(--radius)", padding: 16, cursor: "pointer", transition: "all .2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "var(--cream)", border: "1px solid var(--card-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-instrument-serif), serif", fontSize: 17,
            color: "var(--text-2)",
          }}>
            {getInitials(profile.name)}
          </div>
          {isOnline && (
            <div style={{
              position: "absolute", bottom: 0, right: 0,
              width: 11, height: 11, borderRadius: "50%",
              background: "var(--green)", border: "2px solid var(--card)",
            }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{profile.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontWeight: 300 }}>
            {profile.role} · {profile.company}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {getMatchBadge(profile.match_score)}
            {getSourceBadge(profile.source)}
            {getTypeBadge(profile.match_type)}
          </div>
        </div>
      </div>

      {/* Match reason */}
      <div style={{
        fontSize: 13, color: "var(--text-2)", fontWeight: 300, lineHeight: 1.52,
        marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--card-border)",
      }}>
        {profile.match_reason}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
        {onViewMap && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewMap(); }}
            style={{
              padding: "7px 15px", borderRadius: 100, border: "1px solid var(--card-border)",
              background: "var(--card)", color: "var(--text)", cursor: "pointer",
              fontFamily: "var(--font-geist-sans), sans-serif", fontSize: 12, fontWeight: 600,
              transition: "all .18s",
            }}
          >
            Find on map
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onConnect?.(e); }}
          style={{
            padding: "7px 15px", borderRadius: 100, border: "none",
            background: "var(--green)", color: "#fff", cursor: "pointer",
            fontFamily: "var(--font-geist-sans), sans-serif", fontSize: 12, fontWeight: 600,
            transition: "all .18s",
          }}
        >
          Connect
        </button>
      </div>

      {/* Expanded: conversation starters */}
      {expanded && profile.talking_points.length > 0 && (
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: "1px dashed var(--card-border)",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 10,
          }}>
            Conversation starters
          </div>
          {profile.talking_points.map((tp, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              marginBottom: 8, fontSize: 13, color: "var(--text-2)",
              lineHeight: 1.5, fontWeight: 300,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: "var(--cream)", border: "1px solid var(--card-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10.5, fontWeight: 600, color: "var(--text-2)", marginTop: 1,
              }}>
                {i + 1}
              </div>
              <div>{tp}</div>
            </div>
          ))}
          {profile.goals && (
            <div style={{
              fontSize: 12, color: "var(--text-2)", fontWeight: 300,
              marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--card-border)",
            }}>
              <span style={{ fontWeight: 500 }}>Here to:</span> {profile.goals}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
