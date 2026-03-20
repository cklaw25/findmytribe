"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLocation } from "@/lib/api";

const DEMO_USERS = [
  { id: "usr_001", name: "Aisha Patel", role: "AI Engineer · DeepMind" },
  { id: "usr_002", name: "James Okafor", role: "Founder · Stealth" },
  { id: "usr_003", name: "Sofia Marchetti", role: "ML Researcher · UCL" },
  { id: "usr_006", name: "Luca Ferreira", role: "Full Stack Dev · Freelance" },
  { id: "usr_015", name: "Omar Hassan", role: "Student · Imperial College" },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function handleJoin(userId: string) {
    setLoading(true);
    setSelectedId(userId);
    try {
      await updateLocation(userId, "entrance");
    } catch {
      // continue even if location update fails
    }
    localStorage.setItem("fmt_user_id", userId);
    router.push(`/tribe/${userId}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔮</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FindMyTribe</h1>
          <p className="text-indigo-200 text-sm mt-1">Find your people. Right now. In this room.</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-2xl">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Select your profile to join
          </p>
          <div className="space-y-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.id}
                disabled={loading}
                onClick={() => handleJoin(user.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                  ${selectedId === user.id
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-100 hover:border-violet-200 hover:bg-violet-50"
                  }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {user.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                {selectedId === user.id && (
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Demo mode · Real app uses Luma sign-in
          </p>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={() => router.push("/host")}
            className="text-indigo-200 text-xs underline hover:text-white"
          >
            Event organiser? Open host dashboard →
          </button>
        </div>
      </div>
    </main>
  );
}
