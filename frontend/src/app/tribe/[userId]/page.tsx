"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { getTribeList, updateLocation, getAllLocations } from "@/lib/api";
import { TribeMatch, Zone } from "@/types";
import { ProfileCard } from "@/components/ProfileCard";
import { EventMap } from "@/components/EventMap";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TopBar } from "@/components/TopBar";
import { TabBar } from "@/components/TabBar";
import { AlertStrip } from "@/components/AlertStrip";
import { ZoneScroll, ZONE_LABELS } from "@/components/ZoneScroll";

const LOADING_STEPS = [
  "Reading attendee profiles...",
  "Scoring interest similarity...",
  "Checking mutual connections...",
  "Ranking compatibility...",
  "Generating conversation starters...",
  "Tribe list ready.",
];

// Derive a display name from the user ID (falls back gracefully)
const USER_NAMES: Record<string, string> = {
  usr_001: "Aisha",
  usr_002: "James",
  usr_003: "Sofia",
  usr_006: "Luca",
  usr_015: "Omar",
};

export default function TribePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [tribeList, setTribeList] = useState<TribeMatch[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingDone, setLoadingDone] = useState(false);
  const [view, setView] = useState<"tribe" | "map">("tribe");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentZone, setCurrentZone] = useState<Zone>("entrance");
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const firstName = USER_NAMES[userId] ?? "Your";

  // Fetch tribe list
  async function loadTribe() {
    setFetching(true);
    try {
      const data = await getTribeList(userId);
      setTribeList(data.tribe_list);
      // Surface an alert for the top match if available
      if (data.tribe_list.length > 0) {
        const top = data.tribe_list[0];
        setAlert({
          title: `${top.name} is your top match`,
          body: `${top.match_score}% compatible — ${top.match_reason.split(".")[0]}.`,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    loadTribe();
  }, [userId]);

  // Poll locations for online status
  useEffect(() => {
    async function fetchOnline() {
      try {
        const locs = await getAllLocations();
        const ids = new Set<string>(
          locs.filter((l: { zone?: string }) => l.zone && l.zone !== "unknown").map((l: { user_id: string }) => l.user_id)
        );
        setOnlineUserIds(ids);
      } catch {
        // keep last known state
      }
    }
    fetchOnline();
    const interval = setInterval(fetchOnline, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleZoneChange(zone: string) {
    setCurrentZone(zone as Zone);
    try {
      await updateLocation(userId, zone as Zone);
    } catch {}
  }

  function handleViewOnMap(profile: TribeMatch) {
    setHighlightId(profile.id);
    setView("map");
  }

  // Show loading animation until both fetch AND animation are done
  const showLoading = fetching || !loadingDone;

  if (showLoading) {
    return (
      <main style={{ background: "var(--cream)", minHeight: "100dvh" }}>
        <LoadingScreen
          steps={LOADING_STEPS}
          onComplete={() => setLoadingDone(true)}
        />
      </main>
    );
  }

  const zoneName = ZONE_LABELS[currentZone] ?? currentZone;

  return (
    <main style={{ background: "var(--cream)", minHeight: "100dvh", paddingBottom: 88 }}>
      <TopBar
        title={`${firstName}'s Tribe`}
        subtitle="AI matched · live"
        right={
          <div style={{
            fontSize: 11.5, fontWeight: 500, padding: "5px 12px",
            background: "var(--green-lt)", color: "var(--green)",
            borderRadius: 100, border: "1px solid rgba(90,122,92,.18)", whiteSpace: "nowrap",
          }}>
            {zoneName}
          </div>
        }
      />

      {view === "tribe" && (
        <>
          <ZoneScroll activeZone={currentZone} onChange={handleZoneChange} />

          {alert && (
            <AlertStrip
              title={alert.title}
              body={alert.body}
              onDismiss={() => setAlert(null)}
            />
          )}

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "16px 20px 10px" }}>
            <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 19 }}>
              Interest matches
            </div>
            <div style={{
              fontSize: 11.5, fontWeight: 500, color: "var(--text-3)",
              background: "var(--card)", border: "1px solid var(--card-border)",
              padding: "2px 10px", borderRadius: 100,
            }}>
              {tribeList.length} people
            </div>
          </div>

          {tribeList.length === 0 && (
            <div style={{
              margin: "0 16px",
              padding: "32px 24px",
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: 16,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "var(--font-instrument-serif), serif",
                fontSize: 18,
                color: "var(--text-2)",
                marginBottom: 8,
              }}>
                No matches found yet
              </div>
              <div style={{
                fontSize: 13,
                color: "var(--text-2)",
                lineHeight: 1.5,
                marginBottom: 16,
              }}>
                The AI may still be processing attendee profiles. Tap below to check again.
              </div>
              <button
                onClick={loadTribe}
                style={{
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--green)",
                  background: "var(--green-lt)",
                  border: "1px solid rgba(90,122,92,.18)",
                  borderRadius: 100,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          )}

          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {tribeList.map((match) => (
              <div
                key={match.id}
                onClick={() => setExpandedId(expandedId === match.id ? null : match.id)}
              >
                <ProfileCard
                  profile={match}
                  onViewMap={() => handleViewOnMap(match)}
                  expanded={expandedId === match.id}
                  isOnline={onlineUserIds.has(match.id)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {view === "map" && (
        <>
          <ZoneScroll activeZone={currentZone} onChange={handleZoneChange} />
          <EventMap
            tribeList={tribeList}
            highlightId={highlightId}
            selfZone={currentZone}
          />
          {highlightId && (
            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {tribeList
                .filter((p) => p.id === highlightId)
                .map((p) => (
                  <ProfileCard key={p.id} profile={p} expanded isOnline={onlineUserIds.has(p.id)} />
                ))}
            </div>
          )}
        </>
      )}

      <TabBar active={view} onChange={setView} />
    </main>
  );
}
