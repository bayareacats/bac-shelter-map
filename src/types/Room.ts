export interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  divided: boolean;
  canHaveDivider?: boolean;
  dividerOverride?: boolean | null;
  maxCats?: number;
}
