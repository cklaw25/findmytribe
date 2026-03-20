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
