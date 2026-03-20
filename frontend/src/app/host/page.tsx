"use client";
import { useEffect, useState } from "react";
import { getEventOverview } from "@/lib/api";
import { Users, MapPin, Activity } from "lucide-react";

interface AttendeeWithZone {
  id: string;
  name: string;
  role: string;
  company: string;
  zone: string;
}

interface EventOverview {
  total_attendees: number;
  zone_counts: Record<string, number>;
  attendees: AttendeeWithZone[];
}

const ZONE_COLORS: Record<string, string> = {
  main_hall:  "bg-violet-100 text-violet-700",
  workshop:   "bg-blue-100 text-blue-700",
  chill_zone: "bg-green-100 text-green-700",
  entrance:   "bg-amber-100 text-amber-700",
  outside:    "bg-gray-100 text-gray-600",
  unknown:    "bg-gray-50 text-gray-400",
};

export default function HostDashboard() {
  const [data, setData] = useState<EventOverview | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const overview = await getEventOverview();
      setData(overview);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Activity size={36} className="animate-pulse mx-auto mb-3" />
          <p className="font-semibold">Loading event dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const zones = Object.entries(data.zone_counts).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Host Dashboard</p>
            <h1 className="text-2xl font-bold mt-0.5">🔮 FindMyTribe — Event OS</h1>
            <p className="text-gray-400 text-sm">Encode Club AI London 2026 · Live</p>
          </div>
          <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-2xl p-4">
            <Users size={20} className="text-violet-400 mb-2" />
            <p className="text-2xl font-bold">{data.total_attendees}</p>
            <p className="text-gray-400 text-xs">Total attendees</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4">
            <MapPin size={20} className="text-blue-400 mb-2" />
            <p className="text-2xl font-bold">{zones.length}</p>
            <p className="text-gray-400 text-xs">Active zones</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4">
            <Activity size={20} className="text-green-400 mb-2" />
            <p className="text-2xl font-bold">
              {data.attendees.filter(a => a.zone && a.zone !== "unknown").length}
            </p>
            <p className="text-gray-400 text-xs">Checked in</p>
          </div>
        </div>

        {/* Zone heatmap */}
        <div className="bg-gray-800 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Zone Distribution</h2>
          <div className="space-y-3">
            {zones.map(([zone, count]) => (
              <div key={zone} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 capitalize">{zone.replace("_", " ")}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(count / data.total_attendees) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-300 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendee grid */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">All Attendees</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {data.attendees.map((attendee) => (
              <div key={attendee.id} className="bg-gray-750 border border-gray-700 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {attendee.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{attendee.name}</p>
                    <p className="text-xs text-gray-400 truncate">{attendee.role}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ZONE_COLORS[attendee.zone] || ZONE_COLORS.unknown}`}>
                  {(attendee.zone || "unknown").replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
