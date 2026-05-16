import { useDroppable } from "@dnd-kit/core";
import type { Cat } from "../types/Cat";
import type { Room } from "../types/Room";
import { CatIcon } from "./CatIcon";
import { useEffect, useRef } from "react";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

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

  const leftCats = cats.filter(
    (c) => !room.divided || c.dividerSide !== "right"
  );

  const rightCats = cats.filter(
    (c) => room.divided && c.dividerSide === "right"
  );

  /* ---------------- CAPACITY LOGIC ---------------- */
  const totalCap = room.maxCats ?? 0;
  const leftMax = totalCap;
  const rightMax = room.divided ? totalCap : 0;

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
    alignItems: "start",
  };

  const sideStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    columnGap: `${ITEM_GAP}px`,
    rowGap: "8px",
    justifyItems: "center",
    alignContent: "start",
    width: "100%",
    gridAutoRows: "40px",
    alignItems: "start",
  };

  return (
    <g transform={`translate(${room.x}, ${room.y})`}
    >

      {/* Room outline */}
      <rect
        width={room.width}
        height={room.height}
        rx={2}
        ry={2}
        fill={
          isWholeOver || isLeftOver || isRightOver
            ? "rgba(79, 70, 229, 0.4)" // Indigo 600, 40%
            : "#334155" // Slate 700
        }
        stroke="#64748b" // Slate 500
        strokeWidth={1}
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
        fill="#e2e8f0" // Slate 200
        pointerEvents="none"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {room.label}
        {room.maxCats
          ? room.divided
            ? ` (L:${leftCats.length}/${leftMax} R:${rightCats.length}/${rightMax})`
            : ` (${leftCats.length}/${room.maxCats})`
          : ""}
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
            style={sideStyle}>
            {leftCats.map((cat) => (
              <CatIcon key={cat.id} cat={cat} assigned={true} />
            ))}
            {/* Empty Slots (Left Side) */}
            {room.maxCats && Array.from({ length: Math.max(0, leftMax - leftCats.length) }).map((_, i) => (
              <div
                key={`empty-left-${i}`}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "2px dashed rgba(255, 255, 255, 0.2)",
                  boxSizing: "border-box",
                }}
              />
            ))}
          </div>

          {/* RIGHT */}
          {room.divided && (
            <div ref={setRightRef}
              style={sideStyle}>
              {rightCats.map((cat) => (
                <CatIcon key={cat.id} cat={cat} assigned={true} />
              ))}
              {/* Empty Slots (Right Side) */}
              {room.maxCats && Array.from({ length: Math.max(0, rightMax - rightCats.length) }).map((_, i) => (
                <div
                  key={`empty-right-${i}`}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "2px dashed rgba(255, 255, 255, 0.2)",
                    boxSizing: "border-box",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </foreignObject>



      {/* Edit Controls (Divider Button) - Rendered inside SVG to respect z-index */}
      {editMode && (
        <foreignObject
          x={0}
          y={0}
          width={room.width}
          height={room.height}
          style={{ pointerEvents: "none" }} // Let clicks pass through to room drag/resize
        >
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              pointerEvents: "auto", // Re-enable clicks for the button
            }}
          >
            <Tooltip title={room.divided ? "Remove Divider" : "Add Divider"}>
              <Button
                size="small"
                variant="contained"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent drag start
                  propsRef.current.onCommit({
                    ...room,
                    divided: !room.divided,
                  });
                }}
                sx={{
                  fontSize: "0.6em",
                  padding: "3px 8px",
                  minWidth: "auto",
                  lineHeight: 1.1,
                  backgroundColor: room.divided ? "rgba(34, 197, 94, 0.9)" : "rgba(71, 85, 105, 0.6)",
                  backdropFilter: "blur(4px)",
                  color: room.divided ? "#fff" : "rgba(255, 255, 255, 0.5)",
                  border: "1px solid",
                  borderColor: room.divided ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  boxShadow: room.divided
                    ? "0 0 12px rgba(34, 197, 94, 0.4)"
                    : "none",
                  "&:hover": {
                    backgroundColor: room.divided ? "rgba(34, 197, 94, 1)" : "rgba(71, 85, 105, 0.9)",
                    color: "#fff",
                    boxShadow: room.divided
                      ? "0 0 16px rgba(34, 197, 94, 0.6)"
                      : "0 4px 12px rgba(0, 0, 0, 0.3)",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                  },
                  "&:focus": { outline: "none" },
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 800,
                  fontFamily: "inherit",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                DIVIDER
              </Button>
            </Tooltip>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 4,
              left: 4,
              pointerEvents: "auto",
            }}
          >
            <input
              type="number"
              placeholder="Max"
              defaultValue={room.maxCats}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                propsRef.current.onCommit({
                  ...room,
                  maxCats: isNaN(val) ? undefined : val,
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "50px",
                fontSize: "10px",
                padding: "2px",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(0,0,0,0.5)",
                color: "white",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </foreignObject>
      )
      }
    </g >
  );
}



