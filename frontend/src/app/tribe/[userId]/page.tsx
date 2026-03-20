"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { getTribeList, updateLocation } from "@/lib/api";
import { TribeMatch, Zone } from "@/types";
import { ProfileCard } from "@/components/ProfileCard";
import { EventMap } from "@/components/EventMap";
import { MapPin, Users, RefreshCw, Loader2 } from "lucide-react";

const ZONES: Zone[] = ["entrance", "main_hall", "workshop", "chill_zone", "outside"];

export default function TribePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [tribeList, setTribeList] = useState<TribeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<TribeMatch | null>(null);
  const [currentZone, setCurrentZone] = useState<Zone>("main_hall");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getTribeList(userId);
        setTribeList(data.tribe_list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  async function handleZoneChange(zone: Zone) {
    setCurrentZone(zone);
    setUpdating(true);
    try {
      await updateLocation(userId, zone);
    } catch {}
    setUpdating(false);
  }

  function handleViewOnMap(profile: TribeMatch) {
    setHighlightId(profile.id);
    setView("map");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" />
          <p className="font-semibold text-lg">Finding your tribe...</p>
          <p className="text-indigo-200 text-sm mt-1">AI is analysing all attendees</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 pt-10 pb-6">
        <div className="max-w-sm mx-auto">
          <p className="text-indigo-200 text-xs font-medium mb-1">YOUR TRIBE AT THIS EVENT</p>
          <h1 className="text-white text-2xl font-bold">🔮 FindMyTribe</h1>
          <p className="text-indigo-100 text-sm mt-1">
            {tribeList.length} people matched for you today
          </p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 -mt-3">
        {/* Zone check-in */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-violet-500" />
            <p className="text-xs font-semibold text-gray-700">
              Where are you? {updating && <RefreshCw size={10} className="inline animate-spin ml-1" />}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ZONES.map((zone) => (
              <button
                key={zone}
                onClick={() => handleZoneChange(zone)}
                className={`text-xs px-3 py-1 rounded-full border transition-all capitalize ${
                  currentZone === zone
                    ? "bg-violet-500 text-white border-violet-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
                }`}
              >
                {zone.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-200 rounded-xl p-1 mb-4">
          <button
            onClick={() => setView("list")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "list" ? "bg-white shadow text-violet-600" : "text-gray-500"
            }`}
          >
            <Users size={14} />
            Tribe List
          </button>
          <button
            onClick={() => setView("map")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              view === "map" ? "bg-white shadow text-violet-600" : "text-gray-500"
            }`}
          >
            <MapPin size={14} />
            Live Map
          </button>
        </div>

        {/* List view */}
        {view === "list" && (
          <div className="space-y-3 pb-8">
            {tribeList.map((match) => (
              <div key={match.id} onClick={() => setSelectedProfile(selectedProfile?.id === match.id ? null : match)}>
                <ProfileCard
                  profile={match}
                  onViewMap={() => handleViewOnMap(match)}
                  expanded={selectedProfile?.id === match.id}
                />
              </div>
            ))}
          </div>
        )}

        {/* Map view */}
        {view === "map" && (
          <div className="pb-8">
            <EventMap tribeList={tribeList} highlightId={highlightId} />
            {highlightId && (
              <div className="mt-3">
                {tribeList
                  .filter((p) => p.id === highlightId)
                  .map((p) => (
                    <ProfileCard key={p.id} profile={p} expanded />
                  ))}
              </div>
            )}
            <div className="mt-3 space-y-1">
              {tribeList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setHighlightId(p.id === highlightId ? null : p.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                    highlightId === p.id ? "bg-violet-50 border border-violet-200" : "bg-white border border-gray-100"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {p.name[0]}
                  </div>
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-1">{p.role}</span>
                  <span className="ml-auto text-xs font-semibold text-violet-600">{p.match_score}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
