"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { getTribeList, updateLocation } from "@/lib/api";
import { TribeMatch, Zone } from "@/types";
import { ProfileCard } from "@/components/ProfileCard";
import { EventMap } from "@/components/EventMap";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TopBar } from "@/components/TopBar";
import { TabBar } from "@/components/TabBar";
import { ZoneScroll, ZONE_LABELS } from "@/components/ZoneScroll";
import { useZoneContext } from "@/contexts/ZoneAlertContext";

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
  const { currentZone, setCurrentZone } = useZoneContext();

  const firstName = USER_NAMES[userId] ?? "Your";

  // Fetch tribe list on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await getTribeList(userId);
        setTribeList(data.tribe_list);
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [userId]);

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
                  <ProfileCard key={p.id} profile={p} expanded />
                ))}
            </div>
          )}
        </>
      )}

      <TabBar active={view} onChange={setView} />
    </main>
  );
}
