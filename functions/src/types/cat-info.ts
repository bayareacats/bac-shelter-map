interface ShelterluvCat {
  ID: string;
  Name: string;
  Sex?: string;
  Color?: string;
  Pattern?: string;
  CoverPhoto?: string;
  LastIntakeUnixTime?: number;
  InFoster: boolean;
  DOBUnixTime?: number | string;
  LitterGroupId?: number | string | null;
  Status?: string;
  CurrentLocation?: {
    Tier1?: string;
    Tier2?: string;
  };
}

export { ShelterluvCat };
