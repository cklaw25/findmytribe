export interface Invitation {
  id: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  status: "pending" | "accepted" | "declined";
  direction: "sent" | "received";
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  timestamp: number;
}

const STORAGE_PREFIX = "fmt_";

function getKey(userId: string, suffix: string) {
  return `${STORAGE_PREFIX}${userId}_${suffix}`;
}

const DEFAULT_INVITATIONS: Invitation[] = [
  { id: "usr_007", name: "Yuki Tanaka", role: "AI Safety Researcher", company: "Apollo Research", initials: "YT", status: "pending", direction: "sent", timestamp: Date.now() - 3600000 },
  { id: "usr_002", name: "James Okafor", role: "Founder", company: "Stealth", initials: "JO", status: "accepted", direction: "sent", timestamp: Date.now() - 7200000 },
  { id: "usr_003", name: "Sofia Marchetti", role: "ML Researcher", company: "UCL", initials: "SM", status: "pending", direction: "received", timestamp: Date.now() - 1800000 },
  { id: "usr_006", name: "Luca Ferreira", role: "Full Stack Dev", company: "Freelance", initials: "LF", status: "accepted", direction: "received", timestamp: Date.now() - 5400000 },
];

export function getInvitations(userId: string): Invitation[] {
  if (typeof window === "undefined") return [];
  const key = getKey(userId, "invitations");
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  // Seed with defaults on first load
  localStorage.setItem(key, JSON.stringify(DEFAULT_INVITATIONS));
  return DEFAULT_INVITATIONS;
}

export function addInvitation(userId: string, inv: Invitation): void {
  const invitations = getInvitations(userId);
  // Don't add duplicate
  if (invitations.some((i) => i.id === inv.id)) return;
  invitations.unshift(inv);
  localStorage.setItem(getKey(userId, "invitations"), JSON.stringify(invitations));
}

export function updateInvitationStatus(
  userId: string,
  matchId: string,
  status: "accepted" | "declined"
): void {
  const invitations = getInvitations(userId);
  const updated = invitations.map((inv) =>
    inv.id === matchId ? { ...inv, status } : inv
  );
  localStorage.setItem(getKey(userId, "invitations"), JSON.stringify(updated));
}

export function getConnections(userId: string): Invitation[] {
  return getInvitations(userId).filter((inv) => inv.status === "accepted");
}

export function getChatMessages(userId: string, matchId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const key = getKey(userId, `chat_${matchId}`);
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  return [];
}

export function addChatMessage(
  userId: string,
  matchId: string,
  msg: ChatMessage
): ChatMessage[] {
  const messages = getChatMessages(userId, matchId);
  messages.push(msg);
  localStorage.setItem(getKey(userId, `chat_${matchId}`), JSON.stringify(messages));
  return messages;
}

export function getLastMessage(userId: string, matchId: string): ChatMessage | null {
  const messages = getChatMessages(userId, matchId);
  return messages.length > 0 ? messages[messages.length - 1] : null;
}
