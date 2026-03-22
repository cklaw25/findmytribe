"use client";
import { useEffect, useRef, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { getTribeList, updateLocation, getAllLocations } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { TribeMatch, Zone } from "@/types";
import { ProfileCard } from "@/components/ProfileCard";
import { EventMap } from "@/components/EventMap";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TopBar } from "@/components/TopBar";
import { TabBar } from "@/components/TabBar";
import { ZoneScroll, ZONE_LABELS } from "@/components/ZoneScroll";
import { useZoneContext } from "@/contexts/ZoneAlertContext";
import { addInvitation } from "@/lib/connections";

const LOADING_STEPS = [
  "Reading attendee profiles...",
  "Scoring interest similarity...",
  "Checking mutual connections...",
  "Ranking compatibility...",
  "Generating conversation starters...",
  "Tribe list ready.",
];

const USER_NAMES: Record<string, string> = {
  usr_001: "Aisha",
  usr_002: "James",
  usr_003: "Sofia",
  usr_006: "Luca",
  usr_015: "Omar",
};

export default function TribePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [tribeList, setTribeList] = useState<TribeMatch[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingDone, setLoadingDone] = useState(false);
  const [view, setView] = useState<"tribe" | "map">("tribe");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const { currentZone, setCurrentZone } = useZoneContext();

  const firstName = USER_NAMES[userId] ?? "Your";

async function loadTribe() {
      setFetching(true);
      setError(false);
      try {
        const data = await getTribeList(userId);
        setTribeList(data.tribe_list);
          if (data.tribe_list.length > 0) {
            const top = data.tribe_list[0];
            setAlert({
              title: `${top.name} is your top match`,
              body: `${top.match_score}% compatible —
  ${top.match_reason.split(".")[0]}.`,
            });
          }
        } catch (e) {
          console.error(e);
          setError(true);
      } finally {
        setFetching(false);
      }
    }

    useEffect(() => { loadTribe(); }, [userId]);

  const tribeIdsRef = useRef(new Set<string>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tribeIdsRef.current = new Set(tribeList.map((t) => t.id));
  }, [tribeList]);

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

    // Initial fetch for hydration
    fetchOnline();

    // Supabase Realtime subscription for location changes
    const channel = supabase
      .channel("tribe-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        (payload) => {
          const record = payload.new as { user_id: string; zone: string };
          if (record?.user_id && record.zone && record.zone !== "unknown") {
            setOnlineUserIds((prev) => new Set(prev).add(record.user_id));
          }
          // If a tribe member changed zone, debounce-refresh matches
          if (record?.user_id && tribeIdsRef.current.has(record.user_id)) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(loadTribe, 2000);
          }
        }
      )
      .subscribe();

    // 30s fallback poll
    const interval = setInterval(fetchOnline, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

  function handleConnect(profile: TribeMatch) {
    const initials = profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    addInvitation(userId, {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      company: profile.company,
      initials,
      status: "pending",
      direction: "sent",
      timestamp: Date.now(),
    });
    router.push(`/tribe/${userId}/invitations`);
  }

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
        subtitle="Encode Club AI London 2026"
        onBack={view === "map" ? () => setView("tribe") : undefined}
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
            {error && (
              <div style={{
                background: "var(--card)", border: "1px solid var(--card-border)",
                borderRadius: "var(--radius)", padding: "32px 20px", textAlign: "center",
              }}>
                <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, marginBottom: 6 }}>
                  Something went wrong
                </div>
                <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 300, marginBottom: 16, lineHeight: 1.5 }}>
                  We couldn't load your matches. Check your connection and try again.
                </div>
                <button
                  onClick={loadTribe}
                  style={{
                    padding: "10px 28px", borderRadius: 100, border: "none",
                    background: "var(--green)", color: "#fff", cursor: "pointer",
                    fontFamily: "var(--font-geist-sans), sans-serif", fontSize: 14, fontWeight: 600,
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {!error && tribeList.length === 0 && (
              <div style={{
                background: "var(--card)", border: "1px solid var(--card-border)",
                borderRadius: "var(--radius)", padding: "32px 20px", textAlign: "center",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  border: "2.5px solid var(--card-border)", borderTopColor: "var(--green)",
                  animation: "spin .9s linear infinite", margin: "0 auto 16px",
                }} />
                <div style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 18, marginBottom: 6 }}>
                  AI is still analysing
                </div>
                <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 300, lineHeight: 1.5 }}>
                  Check back in a moment — your tribe list is being built.
                </div>
              </div>
            )}
            {tribeList.map((match) => (
              <div
                key={match.id}
                onClick={() => setExpandedId(expandedId === match.id ? null : match.id)}
                style={{ cursor: "pointer" }}
              >
                <ProfileCard
                  profile={match}
                  onViewMap={() => handleViewOnMap(match)}
                  onConnect={() => handleConnect(match)}
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

      <TabBar active={view} userId={userId} onChange={setView} />
    </main>
  );
}