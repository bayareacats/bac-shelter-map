import { useDroppable } from "@dnd-kit/core";
import type { Cat } from "../types/Cat";
import type { Room } from "../types/Room";
import { CatIcon } from "./CatIcon";
import { useEffect, useRef } from "react";

interface RoomProps {
  room: Room;
  editMode: boolean;
  cats: Cat[];
  onUpdate: (room: Room) => void;
  onCommit: (room: Room) => void;
}

export function RoomSvg({ room, editMode, cats, onUpdate, onCommit }: RoomProps) {
  /* ---------------- DROPPABLES ---------------- */

  const { isOver: isWholeOver, setNodeRef: setWholeRef } = useDroppable({
    id: room.id,
    disabled: room.divided || editMode,
  });

  const { isOver: isLeftOver, setNodeRef: setLeftRef } = useDroppable({
    id: `${room.id}-left`,
    disabled: !room.divided || editMode,
  });

  const { isOver: isRightOver, setNodeRef: setRightRef } = useDroppable({
    id: `${room.id}-right`,
    disabled: !room.divided || editMode,
  });

  /* ---------------- DRAG / RESIZE STATE ---------------- */

  const activeOperation = useRef<"drag" | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const startRoom = useRef<Room | null>(null);

  // Refs to access latest values inside window event listeners
  const latestRoomRef = useRef(room);

  const propsRef = useRef({ onUpdate, onCommit });

  useEffect(() => {
    latestRoomRef.current = room;
    propsRef.current = { onUpdate, onCommit };
  }, [room, onUpdate, onCommit]);

  const GRID_SIZE = 20;
  const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  function onWindowMouseMove(e: MouseEvent) {
    if (!startPoint.current || !startRoom.current || !activeOperation.current) return;

    // Use the SVG's screen CTM to convert mouse delta (pixels) to SVG units.
    const svg = document.querySelector(".floorplan-svg") as SVGSVGElement | null;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const svgDx = (e.clientX - startPoint.current.x) / ctm.a;
    const svgDy = (e.clientY - startPoint.current.y) / ctm.d;

    if (activeOperation.current === "drag") {
      const nextX = snap(startRoom.current.x + svgDx);
      const nextY = snap(startRoom.current.y + svgDy);

      propsRef.current.onUpdate({
        ...startRoom.current,
        x: nextX,
        y: nextY,
      });
    }
  }

  function onWindowMouseUp() {
    if (activeOperation.current && startRoom.current) {
      console.log("Committing room", latestRoomRef.current);
      propsRef.current.onCommit(latestRoomRef.current);
    }

    activeOperation.current = null;
    startPoint.current = null;
    startRoom.current = null;

    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);
  }

  function onMouseDownMove(e: React.MouseEvent<SVGGElement>) {
    if (!editMode) return;

    e.preventDefault();
    e.stopPropagation();

    activeOperation.current = "drag";
    startPoint.current = { x: e.clientX, y: e.clientY };
    startRoom.current = room;

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
  }



  /* ---------------- CAT GROUPING ---------------- */

  const leftCats = cats.filter((c) => !room.divided || c.dividerSide !== "right");

  const rightCats = cats.filter((c) => room.divided && c.dividerSide === "right");

  /* ---------------- RENDER ---------------- */

  const PADDING = 4;
  const GAP_DIVIDED = 16;
  const ITEM_WIDTH = 50;
  const ITEM_GAP = 4;

  const availableWidth = room.divided
    ? (room.width - (PADDING * 2) - GAP_DIVIDED) / 2
    : (room.width - (PADDING * 2));

  const cols = Math.max(1, Math.floor(availableWidth / (ITEM_WIDTH + ITEM_GAP)));

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateColumns: room.divided ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
    columnGap: room.divided ? `${GAP_DIVIDED}px` : "0px",
    gridTemplateRows: "1fr",
    padding: `${PADDING}px`,
    boxSizing: "border-box",
    alignItems: "stretch",
  };

  const getSideStyle = (isOver: boolean): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    columnGap: `${ITEM_GAP}px`,
    rowGap: "8px",
    justifyItems: "center",
    alignContent: "start",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    gridAutoRows: "40px",
    alignItems: "start",
    borderRadius: 3,
    background: isOver ? "rgba(37, 99, 235, 0.12)" : "transparent",
    transition: "background-color 0.12s ease",
  });

  return (
    <g transform={`translate(${room.x}, ${room.y})`}
    >

      {/* Room outline */}
      <rect
        width={room.width}
        height={room.height}
        rx={8}
        ry={8}
        fill={
          isWholeOver || isLeftOver || isRightOver
            ? "#eff6ff"
            : "#ffffff"
        }
        stroke="#94a3b8"
        strokeWidth={1.25}
        cursor={editMode ? "move" : "default"}
        onMouseDown={onMouseDownMove}
      />

      {/* Divider */}
      {room.divided && (
        <line
          x1={room.width / 2}
          y1={0}
          x2={room.width / 2}
          y2={room.height}
          stroke="#2563eb"
          strokeDasharray="2 2"
          strokeWidth={0.5}
          pointerEvents="none"
        />
      )}

      {/* Room label */}
      <text
        x={8}
        y={14}
        fontSize={9}
        fill="#172033"
        pointerEvents="none"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {room.label}
      </text>

      {/* Cat Droppable Area */}
      <foreignObject
        x={0}
        y={30}
        width={room.width}
        height={room.height - 30}
        style={{ pointerEvents: editMode ? "none" : "auto" }}
      >
        <div
          ref={
            room.divided
              ? undefined
              : setWholeRef
          }
          style={containerStyle}
        >
          {/* LEFT */}
          <div ref={room.divided ? setLeftRef : undefined}
            style={getSideStyle(isLeftOver)}>
            {leftCats.map((cat) => (
              <CatIcon key={cat.id} cat={cat} assigned={true} />
            ))}
          </div>

          {/* RIGHT */}
          {room.divided && (
            <div ref={setRightRef}
              style={getSideStyle(isRightOver)}>
              {rightCats.map((cat) => (
                <CatIcon key={cat.id} cat={cat} assigned={true} />
              ))}
            </div>
          )}
        </div>
      </foreignObject>



      {room.canHaveDivider && (
        <foreignObject
          x={Math.max(0, room.width - 64)}
          y={4}
          width={60}
          height={22}
          style={{ pointerEvents: "auto" }}
        >
          <button
            type="button"
            title={room.divided ? "Remove Divider" : "Add Divider"}
            onClick={(e) => {
              e.stopPropagation();
              propsRef.current.onCommit({
                ...room,
                dividerOverride: !room.divided,
              });
            }}
            style={{
              width: "58px",
              height: "20px",
              padding: 0,
              borderRadius: "4px",
              border: room.divided
                ? "1px solid #60a5fa"
                : "1px solid #cbd5e1",
              background: room.divided
                ? "#dbeafe"
                : "#f8fafc",
              color: room.divided ? "#1d4ed8" : "#475569",
              fontSize: "8px",
              fontWeight: 700,
              fontFamily: "inherit",
              lineHeight: "18px",
              cursor: "pointer",
              letterSpacing: 0,
              textTransform: "none",
            }}
          >
            Divider
          </button>
        </foreignObject>
      )}
    </g >
  );
}
