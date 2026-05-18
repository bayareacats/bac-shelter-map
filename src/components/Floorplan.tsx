import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Room } from "../types/Room";
import type { Cat } from "../types/Cat";
import { RoomSvg } from "./RoomSvg";
import Button from "@mui/material/Button";

interface Props {
  rooms: Room[];
  cats: Cat[];
  editMode: boolean;
  onRoomUpdate: (room: Room) => void;
  onRoomCommit: (room: Room) => void;
}

export function FloorPlan({ cats, rooms, editMode, onRoomUpdate, onRoomCommit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state: translate x, y and uniform scale
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startTransformX: 0, startTransformY: 0 });

  function resetView() {
    if (!containerRef.current) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    if (containerW === 0 || containerH === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (rooms.length > 0) {
      rooms.forEach((r) => {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
      });
    } else {
      // Default to 0,0,1000,600 if no rooms
      minX = 0; minY = 0; maxX = 1000; maxY = 600;
    }

    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    if (contentW <= 0 || contentH <= 0) return;

    const scale = Math.min(containerW / contentW, containerH / contentH) * 0.95;

    // Center logic
    const contentCenterX = minX + contentW / 2;
    const contentCenterY = minY + contentH / 2;

    const newX = (containerW / 2) - (contentCenterX * scale);
    const newY = (containerH / 2) - (contentCenterY * scale);

    setTransform({ x: newX, y: newY, scale });
  }

  // 1. Initial fit logic (similar to "meet")
  useLayoutEffect(() => {
    // We can just call resetView on mount if we want to auto-fit rooms
    // But the original code fit 1000x600. Let's keep original behavior on mount 
    // or arguably resetView is better if rooms are loaded.
    // However, rooms might be empty on first render if loaded async?
    // The parent passes `rooms`.
    if (rooms.length > 0) {
      resetView();
    } else {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const contentW = 1000;
      const contentH = 600;
      const scale = Math.min(width / contentW, height / contentH) * 0.95;
      const x = (width - contentW * scale) / 2;
      const y = (height - contentH * scale) / 2;
      setTransform({ x, y, scale });
    }
    // We only run this on mount. If rooms load later, we might want to auto-fit?
    // User asked for a button. Let's stick to the button being the primary way to re-fit.
    // But updating the initial effect to be smart is good.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // 2. Button Zoom logic
  function handleZoom(factor: number) {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();

    // Center of container
    const centerX = width / 2;
    const centerY = height / 2;

    const newScale = Math.min(Math.max(0.1, transform.scale * factor), 10);

    // Calculate cursor position in "world" coordinates before zoom
    const worldX = (centerX - transform.x) / transform.scale;
    const worldY = (centerY - transform.y) / transform.scale;

    // Calculate new translate to keep world point under cursor
    const newX = centerX - worldX * newScale;
    const newY = centerY - worldY * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  }

  // 3. Pan Logic (Mouse/Touch)
  function handleMouseDown(e: React.MouseEvent | React.TouchEvent) {
    // Priority check:
    // 1. If default prevented (handled by child), ignore.
    // 2. If clicking a button, ignore.
    // 3. If clicking a cat (draggable), ignore.
    if (e.defaultPrevented) return;

    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-cat-id]")) {
      return;
    }

    // Only drag if clicking background (not buttons/rooms)
    // Actually, dragging rooms is handled by RoomSvg, but panning should happen on background.
    // We let events bubble?
    // If e.target is the SVG background (or rect), we pan.
    // If e.target is a room, RoomSvg handles it and calls stopPropagation?
    // RoomSvg `onMouseDownMove` does call stopPropagation.

    // We'll treat this as "start pan"
    setIsDragging(true);

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    dragStart.current = {
      x: clientX,
      y: clientY,
      startTransformX: transform.x,
      startTransformY: transform.y,
    };
  }

  useEffect(() => {
    if (!isDragging) return;

    function onMove(e: MouseEvent | TouchEvent) {
      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;

      setTransform((prev) => ({
        ...prev,
        x: dragStart.current.startTransformX + dx,
        y: dragStart.current.startTransformY + dy,
      }));
    }

    function onUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging]);

  return (
    <div
      className="floorplan-print-frame"
      ref={containerRef}

      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none", // Prevent browser scrolling
        position: "relative",
      }}
    >
      <div className="floorplan-controls" style={{ position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: "0.5rem" }}>
        <Button
          variant="contained"
          size="small"
          onClick={resetView}
          sx={{
            backgroundColor: "#ffffff",
            border: "1px solid #bfdbfe",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
            color: "#1d4ed8",
            "&:hover": { backgroundColor: "#eff6ff", boxShadow: "none" }
          }}
        >
          Reset View
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => handleZoom(1.2)}
          sx={{
            minWidth: "40px",
            backgroundColor: "#ffffff",
            border: "1px solid #bfdbfe",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
            color: "#1d4ed8",
            "&:hover": { backgroundColor: "#eff6ff", boxShadow: "none" },
            fontSize: "1.6rem",
            padding: "0"
          }}
        >
          +
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => handleZoom(0.8)}
          sx={{
            minWidth: "40px",
            backgroundColor: "#ffffff",
            border: "1px solid #bfdbfe",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
            color: "#1d4ed8",
            "&:hover": { backgroundColor: "#eff6ff", boxShadow: "none" },
            fontSize: "1.6rem",
            padding: "0"
          }}
        >
          -
        </Button>
      </div>

      <div
        className="floorplan-world"
        style={{
          width: 1000,
          height: 600,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          position: "absolute",
          willChange: "transform",
        }}
      >
        <svg
          className="floorplan-svg"
          viewBox="0 0 1000 600"
          width="1000"
          height="600"
          style={{
            display: "block",
            overflow: "visible",
            outline: "none",
          }}
        >
          <rect x="-5000" y="-5000" width="10000" height="10000" fill="#ffffff" />

          {rooms.map((room) => (<RoomSvg
            key={room.id}
            room={room}
            cats={cats.filter((c) => c.roomId === room.id)}
            editMode={editMode}
            onUpdate={onRoomUpdate}
            onCommit={onRoomCommit}
          />
          ))}
        </svg>

        {/* HTML Overlay matches SVG coordinate system directly (0-1000, 0-600) */}
      </div>
    </div>
  );
}
