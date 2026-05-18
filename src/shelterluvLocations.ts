import type { ShelterluvLocation } from "./types/Cat";

const LOCATION_TO_ROOM_ID: Record<string, string> = {
  "Petco Room 1, Kennel 1": "room-1-k1",
  "Petco Room 1, Kennel 2": "room-1-k2",
  "Petco Room 1, Kennel 3": "room-1-k3",
  "Petco Room 1, Kennel 4": "room-1-k4",
  "Petco Room 1, Kennel 5": "room-1-k5",
  "Petco Room 1, Kennel 6": "room-1-k6",
  "Petco Room 2": "room-2",
  "Petco Room 3": "room-3",
  "Petco Room 4": "room-4",
};

export function getShelterluvLocationLabel(
  location?: ShelterluvLocation | null
): string | null {
  const tier1 = location?.Tier1?.trim();
  const tier2 = location?.Tier2?.trim();

  if (!tier1) return null;
  if (!tier2) return tier1;
  return `${tier1}, ${tier2}`;
}

export function getRoomIdForShelterluvLocation(
  location?: ShelterluvLocation | null
): string | null {
  const label = getShelterluvLocationLabel(location);
  if (!label) return null;
  return LOCATION_TO_ROOM_ID[label] ?? null;
}
