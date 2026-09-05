import express from "express";
import http from "node:http";
import { randomUUID, randomBytes } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import {
  addPlayer,
  applyGameAction,
  ClientEvent,
  createGame,
  GameState,
  MAX_ROOM_USERS,
  RoomSummary,
  ServerEvent,
  setPlayerConnection,
  startGame,
} from "@monopoly/shared";

type Client = {
  id: string;
  name: string;
  socket: WebSocket;
  roomId?: string;
};

type Room = {
  id: string;
  hostId: string;
  maxUsers: number;
  clients: Map<string, Client>;
  game: GameState;
};

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const rooms = new Map<string, Room>();
const clients = new Map<string, Client>();

app.get("/health", (_request, response) => {
  response.json({ ok: true, rooms: rooms.size });
});

app.get("/rooms", (_request, response) => {
  response.json({
    rooms: [...rooms.values()]
      .filter((room) => room.game.status === "LOBBY")
      .map((room) => summary(room)),
  });
});

wss.on("connection", (socket) => {
  const client: Client = {
    id: randomUUID(),
    name: "Player",
    socket,
  };

  clients.set(client.id, client);
  send(client, { type: "connection:ready", clientId: client.id });

  socket.on("message", (rawMessage) => {
    const event = parseEvent(rawMessage.toString());
    if (!event) {
      send(client, { type: "error", message: "Invalid event payload." });
      return;
    }
    handleEvent(client, event);
  });

  socket.on("close", () => {
    leaveRoom(client, false);
    clients.delete(client.id);
  });
});

function handleEvent(client: Client, event: ClientEvent) {
  if (event.type === "room:create") {
    leaveRoom(client, true);
    client.name = event.name.trim() || "Host";

    const roomId = normalizeRoomId(event.roomId || "") || generateRoomCode();
    if (rooms.has(roomId)) {
      send(client, { type: "error", message: "That room already exists. Join it or create without a custom code." });
      return;
    }

    const room: Room = {
      id: roomId,
      hostId: client.id,
      maxUsers: MAX_ROOM_USERS,
      clients: new Map([[client.id, client]]),
      game: createGame(client.id, client.name),
    };
    client.roomId = room.id;
    rooms.set(room.id, room);
    send(client, { type: "room:joined", room: summary(room), game: room.game, clientId: client.id });
    return;
  }

  if (event.type === "room:join") {
    const roomId = normalizeRoomId(event.roomId);
    const room = roomId ? rooms.get(roomId) : undefined;
    if (!room) {
      send(client, { type: "error", message: "Room not found. Ask the host for a fresh invite link." });
      return;
    }

    if (room.game.status !== "LOBBY" && !room.clients.has(client.id)) {
      const existingPlayer = room.game.players.find((player) => player.clientId === client.id);
      if (!existingPlayer) {
        send(client, { type: "error", message: "That game already started." });
        return;
      }
    }

    if (!room.clients.has(client.id) && room.clients.size >= room.maxUsers) {
      send(client, { type: "room:full", roomId });
      return;
    }

    leaveRoom(client, true);
    client.name = event.name.trim() || "Player";
    client.roomId = room.id;
    room.clients.set(client.id, client);
    room.game = addPlayer(room.game, client.id, client.name);
    send(client, { type: "room:joined", room: summary(room), game: room.game, clientId: client.id });
    broadcastState(room);
    return;
  }

  const room = client.roomId ? rooms.get(client.roomId) : undefined;
  if (!room) {
    send(client, { type: "error", message: "Join or host a room first." });
    return;
  }

  if (event.type === "game:start") {
    if (client.id !== room.hostId) {
      send(client, { type: "error", message: "Only the host can start the game." });
      return;
    }
    room.game = startGame(room.game);
    broadcastState(room);
    return;
  }

  if (event.type === "game:action") {
    room.game = applyGameAction(room.game, client.id, event.action, event.tileIndex);
    broadcastState(room);
  }
}

function leaveRoom(client: Client, silent: boolean) {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) {
    client.roomId = undefined;
    return;
  }

  room.clients.delete(client.id);
  room.game = setPlayerConnection(room.game, client.id, false);
  client.roomId = undefined;

  if (room.clients.size === 0) {
    rooms.delete(room.id);
    return;
  }

  if (room.hostId === client.id) {
    const nextHostId = room.clients.keys().next().value;
    if (nextHostId) {
      room.hostId = nextHostId;
    }
  }

  if (!silent) {
    broadcastState(room);
  }
}

function broadcastState(room: Room) {
  const event: ServerEvent = {
    type: "room:state",
    room: summary(room),
    game: room.game,
  };
  const payload = JSON.stringify(event);

  for (const member of room.clients.values()) {
    if (member.socket.readyState === WebSocket.OPEN) {
      member.socket.send(payload);
    }
  }
}

function send(client: Client, event: ServerEvent) {
  if (client.socket.readyState === WebSocket.OPEN) {
    client.socket.send(JSON.stringify(event));
  }
}

function summary(room: Room): RoomSummary {
  return {
    roomId: room.id,
    hostId: room.hostId,
    maxUsers: room.maxUsers,
    userCount: room.clients.size,
    status: room.game.status,
    invitePath: `/?room=${encodeURIComponent(room.id)}`,
  };
}

function parseEvent(raw: string): ClientEvent | null {
  try {
    const event = JSON.parse(raw) as ClientEvent;
    return typeof event?.type === "string" ? event : null;
  } catch {
    return null;
  }
}

function normalizeRoomId(roomId: string) {
  return roomId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 16);
}

function generateRoomCode() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(5);
    let code = "";
    for (const byte of bytes) {
      code += alphabet[byte % alphabet.length];
    }
    if (!rooms.has(code)) return code;
  }
  return randomUUID().slice(0, 8);
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
server.listen(port, host, () => {
  console.log(`Monopoly room server listening on http://${host}:${port}`);
  console.log(`WebSocket path: ws://localhost:${port}/ws`);
});
