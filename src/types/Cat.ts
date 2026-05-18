export interface ShelterluvLocation {
  Tier1?: string;
  Tier2?: string;
}

export interface Cat {
  id: string;
  name: string;
  sex?: string | null;
  color?: string | null;
  pattern?: string | null;
  intakeDate?: number | null; // Unix timestamp
  birthDate?: number | null; // Unix timestamp (seconds) when known
  litterGroupId?: string | null;
  photoUrl?: string | null;
  inFoster: boolean;
  roomId?: string | null;
  dividerSide?: "left" | "right" | null;
  manualRoomOverride?: boolean;
  shelterluvLocation?: ShelterluvLocation | null;
  shelterluvLocationLabel?: string | null;
  shelterluvRoomId?: string | null;
  Status: string | null;
}
