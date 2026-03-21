"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ZONE_LABELS } from "@/components/ZoneScroll";
import type { Zone, TribeMatch } from "@/types";

const COOLDOWN_MS = 30_000;

interface ZoneAlert {
  title: string;
  body: string;
}

export function useZoneAlerts({
  userId,
  currentZone,
  tribeList,
}: {
  userId: string;
  currentZone: Zone;
  tribeList: TribeMatch[];
}) {
  const [alert, setAlert] = useState<ZoneAlert | null>(null);
  const cooldowns = useRef<Map<string, number>>(new Map());

  const tribeLookup = useMemo(() => {
    const map = new Map<string, TribeMatch>();
    for (const match of tribeList) {
      map.set(match.id, match);
    }
    return map;
  }, [tribeList]);

  // Refs so the realtime callback always reads latest values
  // without needing to re-subscribe on every zone/tribe change
  const currentZoneRef = useRef(currentZone);
  currentZoneRef.current = currentZone;

  const tribeLookupRef = useRef(tribeLookup);
  tribeLookupRef.current = tribeLookup;

  useEffect(() => {
    if (!userId || tribeList.length === 0) return;

    const channel = supabase
      .channel("zone-alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "locations",
        },
        (payload) => {
          const newRecord = payload.new as { user_id: string; zone: string };
          const oldRecord = payload.old as { user_id: string; zone: string } | null;

          // Ignore own movement
          if (newRecord.user_id === userId) return;

          // Only care about tribe members
          const tribeMatch = tribeLookupRef.current.get(newRecord.user_id);
          if (!tribeMatch) return;

          // For UPDATE: skip if zone didn't actually change
          if (payload.eventType === "UPDATE" && oldRecord && oldRecord.zone === newRecord.zone) return;

          // Must be entering OUR current zone
          if (newRecord.zone !== currentZoneRef.current) return;

          // Cooldown check
          const now = Date.now();
          const lastAlerted = cooldowns.current.get(newRecord.user_id) ?? 0;
          if (now - lastAlerted < COOLDOWN_MS) return;
          cooldowns.current.set(newRecord.user_id, now);

          const zoneName = ZONE_LABELS[newRecord.zone] ?? newRecord.zone;
          const firstName = tribeMatch.name.split(" ")[0];

          setAlert({
            title: `${firstName} just arrived in ${zoneName}`,
            body: `${tribeMatch.match_score}% match — go say hi!`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, tribeList.length]);

  return { alert, dismissAlert: () => setAlert(null) };
}
