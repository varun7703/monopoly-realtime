import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Node,
  NodeProps,
  Handle,
  Position,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MONOPOLY_BOARD } from "@monopoly/shared";
import { useGameStore } from "../store/useGameStore";

/* ── colour helpers ─────────────────────────────────────── */

const playerColors = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
];

const BAND_COLORS: Record<string, string> = {
  brown: "#78350f",
  light_blue: "#38bdf8",
  pink: "#ec4899",
  orange: "#f97316",
  red: "#dc2626",
  yellow: "#facc15",
  green: "#16a34a",
  dark_blue: "#1e40af",
};

/* ── layout constants (px) ──────────────────────────────── */

const CORNER = 110; // corner tile width & height
const TW = 80; // normal tile short side
const TH = 110; // normal tile long side (along edge)
const GAP = 2;

// Board dimensions
const BOARD_W = CORNER + 9 * (TW + GAP) + CORNER;
const BOARD_H = CORNER + 9 * (TH + GAP) + CORNER;

/* ── build node positions ───────────────────────────────── */

type TileNodeData = {
  tileId: number;
  label: string;
  [key: string]: unknown;
};

function buildNodes(): Node<TileNodeData>[] {
  const nodes: Node<TileNodeData>[] = [];

  const add = (
    id: number,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const tile = MONOPOLY_BOARD[id];
    nodes.push({
      id: String(id),
      type: "tile",
      position: { x, y },
      data: { tileId: id, label: tile.name },
      style: { width: w, height: h },
      draggable: false,
      selectable: false,
      connectable: false,
    });
  };

  // ── Bottom row: tiles 0 (right corner) → 10 (left corner) ──
  // Tile 10 = bottom-left corner
  add(10, 0, BOARD_H - CORNER, CORNER, CORNER);
  // Tiles 9 → 1 left-to-right (but tile order is 9,8,7…1)
  for (let i = 9; i >= 1; i--) {
    const col = 9 - i; // 0..8
    const x = CORNER + col * (TW + GAP);
    add(i, x, BOARD_H - TH, TW, TH);
  }
  // Tile 0 = bottom-right corner
  add(0, BOARD_W - CORNER, BOARD_H - CORNER, CORNER, CORNER);

  // ── Left column: tiles 11 (bottom) → 19 (top) ──
  for (let i = 11; i <= 19; i++) {
    const row = 19 - i; // 0 = top, 8 = bottom
    const y = CORNER + row * (TH + GAP);
    add(i, 0, y, TH, TW); // rotated: width=TH, height=TW
  }

  // ── Top row: tiles 20 (left corner) → 30 (right corner) ──
  add(20, 0, 0, CORNER, CORNER);
  for (let i = 21; i <= 29; i++) {
    const col = i - 20; // 1..9
    const x = CORNER + (col - 1) * (TW + GAP);
    add(i, x, 0, TW, TH);
  }
  add(30, BOARD_W - CORNER, 0, CORNER, CORNER);

  // ── Right column: tiles 31 (top) → 39 (bottom) ──
  for (let i = 31; i <= 39; i++) {
    const row = i - 31; //  0..8
    const y = CORNER + row * (TH + GAP);
    add(i, BOARD_W - TH, y, TH, TW);
  }

  return nodes;
}

const INITIAL_NODES = buildNodes();

/* ── Custom TileNode component ──────────────────────────── */

function TileNode({ data }: NodeProps<Node<TileNodeData>>) {
  const room = useGameStore((s) => s.room);
  const tileId = data.tileId;
  const tile = MONOPOLY_BOARD[tileId];
  const isCorner = [0, 10, 20, 30].includes(tileId);

  const ledger = room?.game?.propertyLedger?.[tileId];
  const playersById = useMemo(() => {
    const map = new Map<string, string>();
    room?.game?.players.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [room]);

  const ownerName = ledger?.ownerId
    ? playersById.get(ledger.ownerId)
    : undefined;

  const tokens = useMemo(() => {
    if (!room?.game) return [];
    return room.game.players
      .map((p, idx) => ({
        id: p.id,
        name: p.name,
        color: playerColors[idx % playerColors.length],
        position: p.position,
      }))
      .filter((p) => p.position === tileId);
  }, [room, tileId]);

  const bandColor = tile.propertyData?.color
    ? BAND_COLORS[tile.propertyData.color]
    : null;

  return (
    <div className={`rf-tile ${isCorner ? "rf-tile-corner" : ""}`}>
      {bandColor && (
        <div
          className="rf-tile-band"
          style={{ backgroundColor: bandColor }}
        />
      )}

      <div className="rf-tile-name">{tile.name}</div>

      {tile.type === "tax" && (
        <div className="rf-tile-price">₹{tile.taxAmount}</div>
      )}
      {tile.propertyData?.price && (
        <div className="rf-tile-price">₹{tile.propertyData.price}</div>
      )}

      {ownerName && (
        <div className="rf-tile-owner">
          <span>{ownerName}</span>
        </div>
      )}

      {ledger && (ledger.houses > 0 || ledger.hotel) && (
        <div className="rf-tile-buildings">
          {ledger.hotel ? (
            <span className="rf-hotel">H</span>
          ) : (
            Array.from({ length: ledger.houses }).map((_, i) => (
              <span key={i} className="rf-house" />
            ))
          )}
        </div>
      )}

      {tokens.length > 0 && (
        <div className="rf-tile-tokens">
          {tokens.map((t) => (
            <span
              key={t.id}
              className="rf-token"
              style={{ backgroundColor: t.color }}
              title={t.name}
            >
              {t.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { tile: TileNode };

/* ── property band class (for deed cards) ───────────────── */
const propertyBandClass: Record<string, string> = {
  brown: "bg-amber-700",
  light_blue: "bg-sky-400",
  pink: "bg-pink-500",
  orange: "bg-orange-500",
  red: "bg-red-600",
  yellow: "bg-yellow-400",
  green: "bg-green-600",
  dark_blue: "bg-blue-800",
};

/* ── Board component ────────────────────────────────────── */

export const Board = () => {
  const room = useGameStore((s) => s.room);
  const [nodes] = useNodesState(INITIAL_NODES);

  const playersById = useMemo(() => {
    const map = new Map<string, string>();
    room?.game?.players.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [room]);

  const deedTiles = useMemo(
    () =>
      MONOPOLY_BOARD.filter(
        (t) =>
          t.type === "property" ||
          t.type === "railroad" ||
          t.type === "utility"
      ),
    []
  );

  return (
    <div className="board-layout">
      <div className="board-wrap">
        <div className="rf-board-container">
          {/* Center MONOPOLY label */}
          <div className="rf-center-label">
            <div className="rf-center-badge">
              <div className="rf-center-logo">MONOPOLY</div>
            </div>
            <p className="rf-center-text">REAL ESTATE TRADING GAME</p>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.02 }}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
          />
        </div>
      </div>

      <aside className="deed-panel">
        <h3>Property Cards</h3>
        <div className="deed-list">
          {deedTiles.map((tile) => {
            const ledger = room?.game?.propertyLedger?.[tile.id];
            const ownerName = ledger?.ownerId
              ? playersById.get(ledger.ownerId)
              : "Bank";
            const color = tile.propertyData?.color
              ? propertyBandClass[tile.propertyData.color]
              : "bg-zinc-700";
            return (
              <div key={`deed-${tile.id}`} className="deed-card">
                <div className={`deed-top ${color}`} />
                <div className="deed-name">{tile.name}</div>
                <div className="deed-meta">
                  Price: ${tile.propertyData?.price ?? 0}
                </div>
                <div className="deed-meta">Owner: {ownerName}</div>
                {ledger && (
                  <div className="deed-meta">
                    {ledger.hotel
                      ? "Hotel"
                      : `Houses: ${ledger.houses}`}{" "}
                    {ledger.mortgaged ? "- Mortgaged" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
};
