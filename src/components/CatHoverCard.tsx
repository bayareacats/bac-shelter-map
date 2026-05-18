import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";
import type { Cat } from "../types/Cat";

interface Props {
  cat: Cat;
  position: { x: number; y: number };
}

export function CatHoverCard({ cat, position }: Props) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const intakeDateStr = cat.intakeDate
    ? new Date(cat.intakeDate * 1000).toLocaleDateString()
    : "Unknown";

  useLayoutEffect(() => {
    if (cardRef.current) {
      const { width, height } = cardRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, [cat]); // Re-measure if cat data changes

  // Calculate position
  let left = position.x + 15;
  let top = position.y + 15;

  if (dimensions) {
    // Flip horizontal if overflowing right
    if (left + dimensions.width > window.innerWidth) {
      left = position.x - dimensions.width - 15;
    }
    
    // Flip vertical if overflowing bottom (optional but good for UX)
    if (top + dimensions.height > window.innerHeight) {
      top = position.y - dimensions.height - 15;
    }
  }

  return createPortal(
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        top: top,
        left: left,
        zIndex: 9999,
        backgroundColor: "rgba(30, 41, 59, 0.95)",
        color: "#fff",
        padding: "0.75rem",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.2)",
        pointerEvents: "none", // Don't interfere with mouse events
        border: "1px solid #475569",
        minWidth: "200px",
        backdropFilter: "blur(4px)",
        opacity: dimensions ? 1 : 0, // Prevent flash of unpositioned content
        transition: "opacity 0.1s ease-out"
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "start" }}>
        <img
          src={cat.photoUrl ?? "/placeholder-cat.png"}
          alt={cat.name}
          width={60}
          height={60}
          style={{
            borderRadius: "6px",
            objectFit: "cover",
            backgroundColor: "#000",
          }}
        />
        <div>
          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{cat.name}</h4>
          <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.4" }}>
            {cat.sex && <div>{cat.sex}</div>}
            {cat.color && <div>{cat.color} {cat.pattern}</div>}
            <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#94a3b8" }}>
              Intake: {intakeDateStr}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
