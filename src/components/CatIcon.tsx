import { useDraggable } from "@dnd-kit/core";
import type { Cat } from "../types/Cat";
import { useState } from "react";
import { CatHoverCard } from "./CatHoverCard";

interface Props {
    cat: Cat;
    assigned?: boolean;
}

export function CatIcon({ cat, assigned = false }: Props) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: cat.id,
    });

    const [hovered, setHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    function handleMouseEnter(e: React.MouseEvent) {
        if (isDragging) return;
        setHovered(true);
        setMousePos({ x: e.clientX, y: e.clientY });
    }

    function handleMouseMove(e: React.MouseEvent) {
        if (isDragging) {
            setHovered(false);
            return;
        }
        setMousePos({ x: e.clientX, y: e.clientY });
    }

    function handleMouseLeave() {
        setHovered(false);
    }

    return (
        <>
            <div
                ref={setNodeRef}
                data-cat-id={cat.id}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    display: "flex",
                    width: assigned ? "50px" : "auto",
                    // Toggle between row (horizontal) and column (vertical)
                    flexDirection: assigned ? "column" : "row",
                    alignItems: "center",
                    justifyContent: "left",
                    gap: assigned ? "0.0rem" : "0.5rem",
                    padding: assigned ? "0.0rem" : "0.2rem",
                    cursor: "grab",
                    // Ensure text centers when stacked vertically
                    textAlign: "center",
                    opacity: isDragging ? 0.5 : 1,
                }}
                {...listeners}
                {...attributes}
            >
                <img
                    src={cat.photoUrl ?? "/placeholder-cat.png"}
                    alt={cat.name}
                    width={30}
                    height={30}
                    style={{
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                    }}
                />

                <div
                    style={{
                        whiteSpace: assigned ? "normal" : "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: assigned ? "-webkit-box" : "block",
                        WebkitLineClamp: assigned ? 2 : undefined,
                        WebkitBoxOrient: assigned ? "vertical" : undefined,
                        lineHeight: assigned ? "1.1" : "inherit",
                        fontSize: assigned ? "0.55rem" : "1rem", // Optional: smaller text when assigned
                        maxWidth: assigned ? "100%" : "none",    // Used to be 50px, but parent is now 50px
                        color: "#172033"
                    }}
                    title={cat.name}
                >
                    {cat.name}
                </div>
            </div>
            {hovered && !isDragging && (
                <CatHoverCard cat={cat} position={mousePos} />
            )}
        </>
    );
}
