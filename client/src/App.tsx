import { Copy, Link2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClientEvent,
  GameAction,
  GameState,
  ownedTiles,
  RoomSummary,
  ServerEvent,
  Tile,
} from "@monopoly/shared";
import { Board } from "./components/Board";
import { ControlPanel } from "./components/ControlPanel";
import { Deed } from "./components/Deed";
import { Lobby } from "./components/Lobby";
import { MoneyBar } from "./components/MoneyBar";
import { useGamePresentation } from "./useGamePresentation";

function resolveSocketUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL as string;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  // Talk to the room server directly. Vite's WS proxy is unreliable on Windows.
  const host = window.location.hostname || "localhost";
  const port = import.meta.env.VITE_WS_PORT ?? "3001";
  return `${protocol}://${host}:${port}/ws`;
}

function initialRoomFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("room")?.trim().toLowerCase() ?? "";
}

export function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const [clientId, setClientId] = useState("");
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [serverGame, setGame] = useState<GameState | null>(null);
  const { displayed: game, rolling, turnNotice } = useGamePresentation(serverGame);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function clearPending() {
    pendingRef.current = false;
    setPending(false);
    clearTimeout(requestTimer.current);
  }
  const [roomId, setRoomId] = useState(initialRoomFromUrl);
  const [name, setName] = useState(`Player ${Math.floor(Math.random() * 90) + 10}`);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState("");
  const [hoverTile, setHoverTile] = useState<Tile | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [tab, setTab] = useState<"buy" | "manage">("buy");
  const [showStats, setShowStats] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const autoJoinTried = useRef(false);
  const inviteRoom = useRef(initialRoomFromUrl());

  useEffect(() => {
    const socket = new WebSocket(resolveSocketUrl());
    socketRef.current = socket;

    socket.addEventListener("open", () => { setStatus("Connected"); setError(""); });
    socket.addEventListener("close", () => { setStatus("Disconnected"); clearPending(); });
    socket.addEventListener("error", () => setError("WebSocket connection failed. Is the server running?"));
    socket.addEventListener("message", (message) => {
      const event = JSON.parse(message.data) as ServerEvent;
      if (event.type !== "connection:ready") clearPending();
      if (event.type === "connection:ready") {
        setClientId(event.clientId);
        return;
      }
      if (event.type === "room:joined" || event.type === "room:state") {
        setRoom(event.room);
        setGame(event.game);
        setRoomId(event.room.roomId);
        const url = new URL(window.location.href);
        url.searchParams.set("room", event.room.roomId);
        window.history.replaceState({}, "", url.toString());
        setError("");
        return;
      }
      if (event.type === "room:full") {
        setError(`Room ${event.roomId} is full.`);
        return;
      }
      if (event.type === "error") {
        setError(event.message);
      }
    });

    return () => { clearTimeout(requestTimer.current); socket.close(); };
  }, []);

  useEffect(() => {
    if (autoJoinTried.current || !inviteRoom.current || !clientId || room || status !== "Connected") return;
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    autoJoinTried.current = true;
    socketRef.current.send(JSON.stringify({ type: "room:join", roomId: inviteRoom.current, name }));
  }, [clientId, room, status, name]);

  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayer) ?? null;
  const me = game?.players.find((player) => player.clientId === clientId) ?? null;
  const pendingTile =
    game?.pendingPurchase === null || game?.pendingPurchase === undefined ? null : game.board[game.pendingPurchase];
  const isMyTurn = Boolean(me && currentPlayer && me.id === currentPlayer.id);
  const isHost = Boolean(room && room.hostId === clientId);

  const inviteUrl = useMemo(() => {
    if (!room) return "";
    return `${window.location.origin}${room.invitePath}`;
  }, [room]);

  function send(event: ClientEvent) {
    if (pendingRef.current || rolling) return;
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError("Socket is not connected yet.");
      return;
    }
    pendingRef.current = true;
    setPending(true);
    requestTimer.current = setTimeout(() => {
      clearPending();
      setError("The server is taking longer than expected. Check your connection before trying again.");
    }, 10000);
    socketRef.current.send(JSON.stringify(event));
  }

  function action(actionName: GameAction, tileIndex?: number) {
    send({ type: "game:action", action: actionName, tileIndex });
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard?.writeText(inviteUrl);
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1500);
  }

  if (!game || !room) {
    return (
      <Lobby
        busy={pending}
        status={status}
        name={name}
        roomId={roomId}
        error={error}
        onName={setName}
        onRoomId={setRoomId}
        onHost={() => send({ type: "room:create", roomId: roomId || undefined, name })}
        onJoin={() => send({ type: "room:join", roomId, name })}
      />
    );
  }

  return (
    <main className="app-shell table-page">
      <header className="room-banner">
        <div>
          <strong>Room {room.roomId}</strong>
          <span>
            {room.userCount}/{room.maxUsers} connected · {status}
          </span>
        </div>
        <div className="invite-actions">
          <code>{inviteUrl}</code>
          <button type="button" onClick={copyInvite} title="Copy invite link">
            <Copy size={16} />
            {inviteCopied ? "Copied" : "Copy invite"}
          </button>
          <a href={inviteUrl} target="_blank" rel="noreferrer">
            <Link2 size={16} />
            Open
          </a>
        </div>
      </header>

      <section className="tabletop">
        <div className="board-wrap">
          <Board game={game} rolling={rolling || (pending && game.phase === "ROLL")} turnNotice={turnNotice && !rolling} onHoverTile={setHoverTile} />
          <Deed tile={hoverTile} />
        </div>

        <ControlPanel
          busy={pending || rolling || status !== "Connected"}
          rolling={rolling}
          game={game}
          me={me}
          isMyTurn={isMyTurn}
          isHost={isHost}
          pendingTile={pendingTile}
          selectedTile={selectedTile}
          onSelectTile={setSelectedTile}
          onStart={() => send({ type: "game:start" })}
          onRoll={() => action("ROLL")}
          onBuy={() => action("BUY")}
          onSkip={() => action("SKIP")}
          onEndTurn={() => action("END_TURN")}
          onPayJail={() => action("PAY_JAIL")}
          onUseJailCard={() => action("USE_JAIL_CARD")}
          onBuyHouse={(index) => action("BUY_HOUSE", index)}
          onSellHouse={(index) => action("SELL_HOUSE", index)}
          onMortgage={(index) => action("MORTGAGE", index)}
          onUnmortgage={(index) => action("UNMORTGAGE", index)}
          tab={tab}
          onTab={setTab}
        />

        <MoneyBar game={game} clientId={clientId} onViewStats={() => setShowStats(true)} />
      </section>

      {error && <p className="error-toast" role="alert">{error}</p>}

      {showStats && (
        <div className="stats-overlay" onClick={() => setShowStats(false)}>
          <div className="stats-modal" onClick={(event) => event.stopPropagation()}>
            <button className="stats-close" onClick={() => setShowStats(false)}>
              ×
            </button>
            <h2>Player stats</h2>
            <div className="stats-grid">
              {game.players.map((player) => (
                <div key={player.id} className="stats-card" style={{ borderColor: player.color }}>
                  <h3>
                    {player.name} · ${player.cash}
                  </h3>
                  <ul>
                    {ownedTiles(game, player.id).map((tile) => {
                      const prop = game.properties[tile.index];
                      return (
                        <li key={tile.index}>
                          <span className="swatch" style={{ background: tile.color ?? "#999" }} />
                          {tile.name}
                          {prop?.houses ? ` (${prop.houses === 5 ? "hotel" : `${prop.houses}h`})` : ""}
                          {prop?.mortgaged ? " [M]" : ""}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
