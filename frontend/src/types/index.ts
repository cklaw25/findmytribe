export interface Attendee {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  interests: string[];
  goals: string;
  twitter?: string;
  github?: string;
  past_events?: string[];
  mutual_friend_ids?: string[];
}

export interface TribeMatch extends Attendee {
  match_score: number;
  match_reason: string;
  talking_points: string[];
  match_type: "collaborator" | "mentor" | "peer" | "founder_match" | "investor";
  source: "interest_match" | "mutual_friend";
}

export interface LocationData {
  user_id: string;
  zone: Zone;
  updated_at?: string;
}

export type Zone = "entrance" | "main_hall" | "workshop" | "chill_zone" | "outside" | "unknown";

export interface ZonePosition {
  x: number;
  y: number;
  label: string;
}
