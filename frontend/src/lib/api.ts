const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getAttendees() {
  const res = await fetch(`${API_URL}/attendees`);
  if (!res.ok) throw new Error("Failed to fetch attendees");
  return res.json();
}

export async function getTribeList(userId: string) {
  const res = await fetch(`${API_URL}/match/${userId}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to get tribe list");
  return res.json();
}

export async function updateLocation(userId: string, zone: string) {
  const res = await fetch(`${API_URL}/location/${userId}?zone=${zone}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to update location");
  return res.json();
}

export async function getAllLocations() {
  const res = await fetch(`${API_URL}/locations`);
  if (!res.ok) throw new Error("Failed to fetch locations");
  return res.json();
}

export async function getEventOverview() {
  const res = await fetch(`${API_URL}/event/overview`);
  if (!res.ok) throw new Error("Failed to fetch event overview");
  return res.json();
}

export async function getDebugMatch(userId: string) {
  const res = await fetch(`${API_URL}/debug/match/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch debug match data");
  return res.json();
}

export async function sendConnectionRequest(fromUser: string, toUser: string) {
  const res = await fetch(`${API_URL}/connections/${fromUser}/${toUser}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to send connection request");
  return res.json();
}

export async function fetchConnections(userId: string) {
  const res = await fetch(`${API_URL}/connections/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch connections");
  return res.json();
}

export async function updateConnectionStatus(fromUser: string, toUser: string, status: "accepted" | "declined") {
  const res = await fetch(`${API_URL}/connections/${fromUser}/${toUser}?status=${status}`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to update connection status");
  return res.json();
}
