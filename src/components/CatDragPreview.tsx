import type { Cat } from "../types/Cat";

interface Props {
  cat: Cat;
}

export function CatDragPreview({ cat }: Props) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem",
        background: "#ffffff",
        color: "#172033",
        border: "1px solid #93c5fd",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
        pointerEvents: "none",
      }}
    >
      <img
        src={cat.photoUrl ?? "/placeholder-cat.png"}
        width={36}
        height={36}
        style={{ borderRadius: "50%" }}
      />
      <strong>{cat.name}</strong>
    </div>
  );
}
