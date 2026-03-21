"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getTribeList } from "@/lib/api";
import { useZoneAlerts } from "@/hooks/useZoneAlerts";
import { AlertStrip } from "@/components/AlertStrip";
import type { TribeMatch, Zone } from "@/types";

interface ZoneAlertContextValue {
  currentZone: Zone;
  setCurrentZone: (zone: Zone) => void;
}

const ZoneAlertContext = createContext<ZoneAlertContextValue>({
  currentZone: "entrance",
  setCurrentZone: () => {},
});

export function useZoneContext() {
  return useContext(ZoneAlertContext);
}

export function ZoneAlertProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentZone, setCurrentZone] = useState<Zone>("entrance");
  const [tribeList, setTribeList] = useState<TribeMatch[]>([]);

  // Pick up userId from localStorage (set by login page)
  useEffect(() => {
    const id = localStorage.getItem("fmt_user_id");
    if (id) {
      setUserId(id);
      getTribeList(id)
        .then((data) => setTribeList(data.tribe_list))
        .catch(() => {});
    }

    // Re-check on storage changes (e.g. login in another tab)
    function onStorage() {
      const id = localStorage.getItem("fmt_user_id");
      setUserId(id);
      if (id) {
        getTribeList(id)
          .then((data) => setTribeList(data.tribe_list))
          .catch(() => {});
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { alert, dismissAlert } = useZoneAlerts({
    userId: userId ?? "",
    currentZone,
    tribeList,
  });

  return (
    <ZoneAlertContext.Provider value={{ currentZone, setCurrentZone }}>
      {children}
      {alert && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <AlertStrip
            title={alert.title}
            body={alert.body}
            onDismiss={dismissAlert}
          />
        </div>
      )}
    </ZoneAlertContext.Provider>
  );
}
