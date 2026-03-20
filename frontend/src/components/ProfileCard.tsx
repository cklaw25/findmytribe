"use client";
import { TribeMatch } from "@/types";
import { Users, MapPin } from "lucide-react";

interface ProfileCardProps {
  profile: TribeMatch;
  onViewMap?: () => void;
  expanded?: boolean;
}

const SCORE_STYLE = (score: number) =>
  score >= 80
    ? "bg-green-100 text-green-700"
    : score >= 60
    ? "bg-yellow-100 text-yellow-700"
    : "bg-gray-100 text-gray-500";

const AVATAR_COLORS = [
  "from-violet-500 to-indigo-500",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-orange-500",
  "from-teal-500 to-cyan-500",
  "from-emerald-500 to-green-500",
];

function getAvatarColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function ProfileCard({ profile, onViewMap, expanded = false }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(profile.id)} flex items-center justify-center text-white font-bold text-base shrink-0`}
          >
            {profile.name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{profile.name}</h3>
            <p className="text-xs text-gray-500">
              {profile.role} · {profile.company}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${SCORE_STYLE(profile.match_score)}`}>
          {profile.match_score}% match
        </span>
      </div>

      {/* Mutual friend badge */}
      {profile.source === "mutual_friend" && (
        <div className="flex items-center gap-1 mb-2 text-xs text-indigo-600 font-medium">
          <Users size={12} />
          <span>Mutual connection</span>
        </div>
      )}

      {/* Match reason */}
      <p className="text-xs text-gray-600 mb-3 leading-relaxed">{profile.match_reason}</p>

      {/* Interest tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {profile.interests.slice(0, 4).map((i) => (
          <span key={i} className="bg-violet-50 text-violet-600 text-xs px-2 py-0.5 rounded-full">
            {i}
          </span>
        ))}
      </div>

      {/* Talking points */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
        <p className="text-xs font-semibold text-amber-700 mb-1">Open with:</p>
        <p className="text-xs text-amber-800 italic">"{profile.talking_points[0]}"</p>
        {expanded && profile.talking_points.slice(1).map((tp, i) => (
          <p key={i} className="text-xs text-amber-700 mt-1">• {tp}</p>
        ))}
      </div>

      {/* Goals */}
      {expanded && profile.goals && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">They're here to:</p>
          <p className="text-xs text-blue-800">{profile.goals}</p>
        </div>
      )}

      {/* View on map button */}
      {onViewMap && (
        <button
          onClick={onViewMap}
          className="w-full flex items-center justify-center gap-1 text-xs text-indigo-600 font-medium py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          <MapPin size={12} />
          Find on map
        </button>
      )}
    </div>
  );
}
