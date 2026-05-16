export interface Cat {
  id: string;
  name: string;
  sex?: string | null;
  color?: string | null;
  pattern?: string | null;
  intakeDate?: number | null; // Unix timestamp
  birthDate?: number | null; // Unix timestamp (seconds) when known
  photoUrl?: string | null;
  inFoster: boolean;
  roomId?: string | null;
  dividerSide?: "left" | "right" | null;
  Status: string | null;
}
