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

function getRoomCornerRadii(roomId: string, radius: number) {
  switch (roomId) {
    case "room-1-k1":
      return { topLeft: radius, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    case "room-1-k3":
      return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: radius };
    case "room-1-k4":
      return { topLeft: 0, topRight: radius, bottomRight: 0, bottomLeft: 0 };
    case "room-1-k6":
      return { topLeft: 0, topRight: 0, bottomRight: radius, bottomLeft: 0 };
    case "room-1-k2":
    case "room-1-k5":
      return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    default:
      return { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius };
  }
}

function roundedRectPath(width: number, height: number, radii: ReturnType<typeof getRoomCornerRadii>) {
  const tl = Math.min(radii.topLeft, width / 2, height / 2);
  const tr = Math.min(radii.topRight, width / 2, height / 2);
  const br = Math.min(radii.bottomRight, width / 2, height / 2);
  const bl = Math.min(radii.bottomLeft, width / 2, height / 2);

  return [
    `M ${tl} 0`,
    `H ${width - tr}`,
    tr ? `Q ${width} 0 ${width} ${tr}` : `L ${width} 0`,
    `V ${height - br}`,
    br ? `Q ${width} ${height} ${width - br} ${height}` : `L ${width} ${height}`,
    `H ${bl}`,
    bl ? `Q 0 ${height} 0 ${height - bl}` : `L 0 ${height}`,
    `V ${tl}`,
    tl ? `Q 0 0 ${tl} 0` : "L 0 0",
    "Z",
  ].join(" ");
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
  const roomPath = roundedRectPath(room.width, room.height, getRoomCornerRadii(room.id, 8));

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
    background: isOver ? "rgba(99, 102, 241, 0.28)" : "transparent",
    transition: "background-color 0.12s ease",
  });

  return (
    <g transform={`translate(${room.x}, ${room.y})`}
    >

      {/* Room outline */}
      <path
        d={roomPath}
        fill={
          isWholeOver || isLeftOver || isRightOver
            ? "rgba(79, 70, 229, 0.4)"
            : "#334155"
        }
        stroke="#64748b"
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
          stroke="#94a3b8"
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
        fill="#e2e8f0"
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
          x={Math.max(0, room.width - 62)}
          y={5}
          width={58}
          height={20}
          style={{ pointerEvents: "auto" }}
        >
          <button
            className="divider-toggle"
            data-divider-active={room.divided ? "true" : "false"}
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
              width: "56px",
              height: "18px",
              padding: 0,
              borderRadius: "4px",
              border: room.divided
                ? "1px solid rgba(147, 197, 253, 0.55)"
                : "1px solid rgba(148, 163, 184, 0.25)",
              background: room.divided
                ? "rgba(37, 99, 235, 0.78)"
                : "rgba(71, 85, 105, 0.58)",
              color: room.divided ? "#fff" : "rgba(226, 232, 240, 0.72)",
              fontSize: "8px",
              fontWeight: 700,
              fontFamily: "inherit",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              letterSpacing: 0,
              textTransform: "none",
              outline: "none",
              boxShadow: "none",
            }}
          >
            Divider
          </button>
        </foreignObject>
      )}
    </g >
  );
}
