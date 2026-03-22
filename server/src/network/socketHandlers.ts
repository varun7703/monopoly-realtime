import { Server, Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import {
  buildHouse,
  buyCurrentProperty,
  createGame,
  endTurn,
  mortgageProperty,
  passBid,
  payJailFine,
  placeBid,
  proposeTrade,
  respondTrade,
  rollAndMove,
  RuntimeGameState,
  startAuction,
  unmortgageProperty,
  useGetOutOfJailCard
} from "../engine/gameEngine";
import { SavedGame } from "../models/SavedGame";
import { getRoom, removeSocketFromRooms, setRoom } from "./roomManager";

const makeCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

const emitRoomState = (io: Server, code: string) => {
  const room = getRoom(code);
  if (!room) return;
  io.to(code).emit("room:state", room);
};

const mutateGame = (game: RuntimeGameState, action: () => void) => {
  action();
  game.updatedAt = Date.now();
};

interface AckResponse {
  ok: boolean;
  error?: string;
  code?: string;
  playerId?: string;
}

interface RoomCreatePayload {
  playerName: string;
}

interface RoomJoinPayload {
  code: string;
  playerName: string;
  spectator?: boolean;
}

interface RoomReconnectPayload {
  code: string;
  playerId: string;
}

interface GameCodePayload {
  code: string;
}

interface GameActionPayload {
  code: string;
  playerId: string;
  type: string;
  payload?: Record<string, unknown>;
}

interface ChatPayload {
  code: string;
  playerName: string;
  message: string;
}

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  socket.on("room:create", ({ playerName }: RoomCreatePayload, cb?: (response: AckResponse) => void) => {
    let code = makeCode();
    while (getRoom(code)) code = makeCode();
    const room = {
      code,
      players: [{ id: uuid(), name: playerName, socketId: socket.id }],
      chat: []
    };
    setRoom(room);
    socket.join(code);
    cb?.({ ok: true, code, playerId: room.players[0].id });
    emitRoomState(io, code);
  });

  socket.on("room:join", ({ code, playerName, spectator }: RoomJoinPayload, cb?: (response: AckResponse) => void) => {
    const room = getRoom(code);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    if (room.players.filter((p) => !p.spectator).length >= 6 && !spectator) return cb?.({ ok: false, error: "Room full" });
    const player = { id: uuid(), name: playerName, socketId: socket.id, spectator };
    room.players.push(player);
    socket.join(code);
    cb?.({ ok: true, playerId: player.id });
    emitRoomState(io, code);
  });

  socket.on("room:reconnect", ({ code, playerId }: RoomReconnectPayload, cb?: (response: AckResponse) => void) => {
    const room = getRoom(code);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return cb?.({ ok: false, error: "Player not found" });
    player.socketId = socket.id;
    socket.join(code);
    cb?.({ ok: true });
    emitRoomState(io, code);
  });

  socket.on("game:start", ({ code }: GameCodePayload, cb?: (response: AckResponse) => void) => {
    const room = getRoom(code);
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    const activePlayers = room.players.filter((p) => !p.spectator);
    if (activePlayers.length < 2) return cb?.({ ok: false, error: "Need at least 2 players" });
    room.game = createGame(code, activePlayers);
    emitRoomState(io, code);
    cb?.({ ok: true });
  });

  socket.on("game:action", async ({ code, playerId, type, payload }: GameActionPayload, cb?: (response: AckResponse) => void) => {
    try {
      const room = getRoom(code);
      if (!room?.game) throw new Error("Game missing");
      const game = room.game;
      const actionPayload = payload ?? {};
      mutateGame(game, () => {
        switch (type) {
          case "ROLL":
            rollAndMove(game, playerId);
            break;
          case "BUY_PROPERTY":
            buyCurrentProperty(game, playerId);
            break;
          case "START_AUCTION":
            startAuction(game, playerId);
            break;
          case "PLACE_BID":
            placeBid(game, playerId, Number(actionPayload.bid));
            break;
          case "PASS_BID":
            passBid(game, playerId);
            break;
          case "BUILD_HOUSE":
            buildHouse(game, playerId, Number(actionPayload.tileId));
            break;
          case "MORTGAGE":
            mortgageProperty(game, playerId, Number(actionPayload.tileId));
            break;
          case "UNMORTGAGE":
            unmortgageProperty(game, playerId, Number(actionPayload.tileId));
            break;
          case "PROPOSE_TRADE":
            proposeTrade(
              game,
              playerId,
              String(actionPayload.toPlayerId),
              (actionPayload.offeredPropertyIds as number[]) ?? [],
              (actionPayload.requestedPropertyIds as number[]) ?? [],
              Number(actionPayload.offeredMoney ?? 0),
              Number(actionPayload.requestedMoney ?? 0)
            );
            break;
          case "RESPOND_TRADE":
            respondTrade(game, playerId, Boolean(actionPayload.accept));
            break;
          case "END_TURN":
            endTurn(game, false);
            break;
          case "USE_JAIL_CARD":
            useGetOutOfJailCard(game, playerId);
            break;
          case "PAY_JAIL_FINE":
            payJailFine(game, playerId);
            break;
          default:
            throw new Error("Unknown action");
        }
      });
      emitRoomState(io, code);
      cb?.({ ok: true });
    } catch (error) {
      cb?.({ ok: false, error: (error as Error).message });
    }
  });

  socket.on("game:save", async ({ code }: GameCodePayload, cb?: (response: AckResponse) => void) => {
    try {
      const room = getRoom(code);
      if (!room?.game) throw new Error("No game");
      await SavedGame.findOneAndUpdate({ roomCode: code }, { state: room.game }, { upsert: true });
      cb?.({ ok: true });
    } catch (error) {
      cb?.({ ok: false, error: (error as Error).message });
    }
  });

  socket.on("game:load", async ({ code }: GameCodePayload, cb?: (response: AckResponse) => void) => {
    try {
      const room = getRoom(code);
      if (!room) throw new Error("Room not found");
      const saved = await SavedGame.findOne({ roomCode: code });
      if (!saved) throw new Error("No saved game for room");
      room.game = saved.state as RuntimeGameState;
      emitRoomState(io, code);
      cb?.({ ok: true });
    } catch (error) {
      cb?.({ ok: false, error: (error as Error).message });
    }
  });

  socket.on("chat:send", ({ code, playerName, message }: ChatPayload) => {
    const room = getRoom(code);
    if (!room) return;
    room.chat.push({ from: playerName, message, at: Date.now() });
    io.to(code).emit("chat:update", room.chat.slice(-100));
  });

  socket.on("disconnect", () => {
    const touched = removeSocketFromRooms(socket.id);
    touched.forEach((code) => emitRoomState(io, code));
  });
};
