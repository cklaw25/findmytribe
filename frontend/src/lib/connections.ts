import { sendConnectionRequest, fetchConnections, updateConnectionStatus } from "./api";

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

  // Fire-and-forget API call to persist on backend
  sendConnectionRequest(userId, inv.id).catch(() => {});
}

export function updateInvitationStatus(
  userId: string,
  matchId: string,
  status: "accepted" | "declined"
): void {
  const invitations = getInvitations(userId);
  const inv = invitations.find((i) => i.id === matchId);
  const updated = invitations.map((i) =>
    i.id === matchId ? { ...i, status } : i
  );
  localStorage.setItem(getKey(userId, "invitations"), JSON.stringify(updated));

  // Fire-and-forget API call
  if (inv) {
    const fromUser = inv.direction === "received" ? matchId : userId;
    const toUser = inv.direction === "received" ? userId : matchId;
    updateConnectionStatus(fromUser, toUser, status).catch(() => {});
  }
}

export function getConnections(userId: string): Invitation[] {
  return getInvitations(userId).filter((inv) => inv.status === "accepted");
}

/**
 * Sync localStorage with backend connections. Call on page load to hydrate.
 * Returns the merged invitation list.
 */
export async function syncConnections(userId: string): Promise<Invitation[]> {
  try {
    const remote = await fetchConnections(userId);
    const local = getInvitations(userId);
    const localIds = new Set(local.map((i) => i.id));

    for (const conn of remote) {
      const peerId = conn.direction === "sent" ? conn.to_user : conn.from_user;
      if (!localIds.has(peerId)) {
        // New connection from backend not in localStorage
        local.push({
          id: peerId,
          name: peerId,
          role: "",
          company: "",
          initials: peerId.slice(0, 2).toUpperCase(),
          status: conn.status,
          direction: conn.direction,
          timestamp: Date.now(),
        });
      }
    }

    localStorage.setItem(getKey(userId, "invitations"), JSON.stringify(local));
    return local;
  } catch {
    // API unavailable — return localStorage data
    return getInvitations(userId);
  }
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
