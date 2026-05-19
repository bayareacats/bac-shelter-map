import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Room } from "../types/Room";
import type { Cat } from "../types/Cat";
import { RoomSvg } from "./RoomSvg";

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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [usePrintLayout, setUsePrintLayout] = useState(false);
  const [isCompact, setIsCompact] = useState(() => window.matchMedia("(max-width: 1050px)").matches);
  const useVerticalLayout = !usePrintLayout && isCompact;
  const laidOutRooms = useMemo(() => getFlexLayoutRooms(rooms, useVerticalLayout), [rooms, useVerticalLayout]);
  const layoutBounds = useMemo(() => getLayoutBounds(laidOutRooms), [laidOutRooms]);
  const canvasWidth = Math.max(1000, Math.ceil((layoutBounds?.maxX ?? 1000) + 20));
  const canvasHeight = Math.max(600, Math.ceil((layoutBounds?.maxY ?? 600) + 20));
  const compactFrameHeight = useMemo(() => {
    if (!useVerticalLayout || containerSize.width <= 0 || !layoutBounds) return undefined;
    const padding = 20;
    const contentW = layoutBounds.maxX - layoutBounds.minX + padding * 2;
    const contentH = layoutBounds.maxY - layoutBounds.minY + padding * 2;
    return Math.ceil(contentH * ((containerSize.width / contentW) * 0.98));
  }, [containerSize.width, layoutBounds, useVerticalLayout]);
  const roomBoundsKey = useMemo(
    () => laidOutRooms.map((r) => `${r.id}:${r.x},${r.y},${r.width},${r.height}`).join("|"),
    [laidOutRooms]
  );

  const fitToAvailableSpace = useCallback(() => {
    if (!containerRef.current) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    if (containerW === 0 || containerH === 0) return;

    const { minX, minY, maxX, maxY } = layoutBounds ?? {
      minX: 0,
      minY: 0,
      maxX: 1000,
      maxY: 600,
    };

    const padding = 20;
    const paddedMinX = minX - padding;
    const paddedMinY = minY - padding;
    const paddedMaxX = maxX + padding;
    const paddedMaxY = maxY + padding;

    const contentW = paddedMaxX - paddedMinX;
    const contentH = paddedMaxY - paddedMinY;

    if (contentW <= 0 || contentH <= 0) return;

    const scale = useVerticalLayout
      ? (containerW / contentW) * 0.98
      : Math.min(containerW / contentW, containerH / contentH) * 0.98;

    // Center logic
    const contentCenterX = paddedMinX + contentW / 2;
    const contentCenterY = paddedMinY + contentH / 2;

    const newX = (containerW / 2) - (contentCenterX * scale);
    const newY = useVerticalLayout
      ? padding - (paddedMinY * scale)
      : (containerH / 2) - (contentCenterY * scale);

    setTransform({ x: newX, y: newY, scale });
  }, [laidOutRooms, layoutBounds, roomBoundsKey, useVerticalLayout]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let animationFrame = requestAnimationFrame(fitToAvailableSpace);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const { width, height } = element.getBoundingClientRect();
        setContainerSize({ width, height });
        fitToAvailableSpace();
      });
    });

    const onBeforePrint = () => setUsePrintLayout(true);
    const onAfterPrint = () => setUsePrintLayout(false);

    const { width, height } = element.getBoundingClientRect();
    setContainerSize({ width, height });
    observer.observe(element);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [fitToAvailableSpace]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1050px)");
    const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      className="floorplan-print-frame"
      ref={containerRef}
      style={{
        width: "100%",
        height: compactFrameHeight ? `${compactFrameHeight}px` : "100%",
        minHeight: compactFrameHeight ? `${compactFrameHeight}px` : undefined,
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 16,
        overflowX: "hidden",
        overflowY: useVerticalLayout ? "auto" : "hidden",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
        touchAction: "none", // Prevent browser scrolling
        position: "relative",
      }}
    >
      <div
        className="floorplan-world"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          position: "absolute",
          willChange: "transform",
        }}
      >
        <svg
          className="floorplan-svg"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            display: "block",
            overflow: "visible",
            outline: "none",
          }}
        >
          <rect x="-5000" y="-5000" width="10000" height="10000" fill="#1e293b" />

          {laidOutRooms.map((room) => (<RoomSvg
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

function getFlexLayoutRooms(rooms: Room[], vertical: boolean) {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const layout: Room[] = [];

  const margin = 20;
  const gap = 20;
  const kennelWidth = 260;
  const kennelHeight = 180;
  const compactWidth = 360;
  const roomWidth = vertical ? compactWidth : 260;
  const roomHeight = vertical ? 260 : 260;
  const roomBlockX = margin + kennelWidth * 2 + gap;
  const roomBlockY = margin;

  const pushRoom = (id: string, x: number, y: number, width: number, height: number) => {
    const room = byId.get(id);
    if (!room) return;
    layout.push({ ...room, x, y, width, height });
  };

  if (vertical) {
    let y = margin;
    ["room-1-k1", "room-1-k2", "room-1-k3", "room-1-k4", "room-1-k5", "room-1-k6"].forEach((id) => {
      pushRoom(id, margin, y, compactWidth, kennelHeight);
      y += kennelHeight;
    });

    y += gap;
    pushRoom("room-2", margin, y, roomWidth, roomHeight);
    y += roomHeight + gap;
    pushRoom("room-3", margin, y, roomWidth, roomHeight);
    y += roomHeight + gap;
    pushRoom("room-4", margin, y, roomWidth, roomHeight);
  } else {
    for (let index = 0; index < 6; index += 1) {
      const id = `room-1-k${index + 1}`;
      const col = index < 3 ? 0 : 1;
      const row = index % 3;
      pushRoom(
        id,
        margin + col * kennelWidth,
        margin + row * kennelHeight,
        kennelWidth,
        kennelHeight
      );
    }

    pushRoom("room-4", roomBlockX, roomBlockY, roomWidth * 2 + gap, roomHeight);
    pushRoom("room-2", roomBlockX, roomBlockY + roomHeight + gap, roomWidth, roomHeight);
    pushRoom("room-3", roomBlockX + roomWidth + gap, roomBlockY + roomHeight + gap, roomWidth, roomHeight);
  }

  const knownRoomIds = new Set(layout.map((room) => room.id));
  const otherRooms = rooms.filter((room) => !knownRoomIds.has(room.id));
  otherRooms.forEach((room, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    layout.push({
      ...room,
      x: vertical ? margin : roomBlockX + col * (roomWidth + gap),
      y: vertical
        ? margin + (kennelHeight * 6) + gap + (roomHeight + gap) * 3 + row * (roomHeight + gap)
        : roomBlockY + (roomHeight + gap) * 2 + row * (roomHeight + gap),
      width: roomWidth,
      height: roomHeight,
    });
  });

  return layout;
}

function getLayoutBounds(rooms: Room[]) {
  if (!rooms.length) return null;

  return rooms.reduce(
    (bounds, room) => ({
      minX: Math.min(bounds.minX, room.x),
      minY: Math.min(bounds.minY, room.y),
      maxX: Math.max(bounds.maxX, room.x + room.width),
      maxY: Math.max(bounds.maxY, room.y + room.height),
    }),
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  );
}
