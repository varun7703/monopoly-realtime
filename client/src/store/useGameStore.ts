import { GameState } from "@monopoly/shared";
import { io, Socket } from "socket.io-client";
import { create } from "zustand";

interface RoomState {
  code: string;
  players: Array<{ id: string; name: string; spectator?: boolean }>;
  game?: GameState;
  chat: Array<{ from: string; message: string; at: number }>;
}

interface Store {
  socket?: Socket;
  room?: RoomState;
  playerId?: string;
  playerName: string;
  error?: string;
  setName: (name: string) => void;
  connect: () => void;
  createRoom: () => void;
  joinRoom: (code: string, spectator?: boolean) => void;
  startGame: () => void;
  action: (type: string, payload?: Record<string, unknown>) => void;
  sendChat: (message: string) => void;
  saveGame: () => void;
  loadGame: () => void;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

export const useGameStore = create<Store>((set, get) => ({
  playerName: "Player",
  setName: (name) => set({ playerName: name }),
  connect: () => {
    if (get().socket) return;
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      const savedPlayerId = localStorage.getItem("monopolyPlayerId");
      const savedRoomCode = localStorage.getItem("monopolyRoomCode");
      if (savedPlayerId && savedRoomCode) {
        socket.emit("room:reconnect", { code: savedRoomCode, playerId: savedPlayerId });
        set({ playerId: savedPlayerId });
      }
    });
    socket.on("room:state", (room: RoomState) => set({ room }));
    socket.on("chat:update", (chat) => set((state) => ({ room: state.room ? { ...state.room, chat } : state.room })));
    set({ socket });
  },
  createRoom: () => {
    const { socket, playerName } = get();
    if (!socket) return;
    socket.emit("room:create", { playerName }, (res: { ok: boolean; error?: string; playerId?: string; code?: string }) => {
      if (!res.ok) set({ error: res.error });
      else {
        if (res.playerId) localStorage.setItem("monopolyPlayerId", res.playerId);
        if (res.code) localStorage.setItem("monopolyRoomCode", res.code);
        set({ playerId: res.playerId, error: undefined });
      }
    });
  },
  joinRoom: (code, spectator) => {
    const { socket, playerName } = get();
    if (!socket) return;
    socket.emit("room:join", { code, playerName, spectator }, (res: { ok: boolean; error?: string; playerId?: string }) => {
      if (!res.ok) set({ error: res.error });
      else {
        if (res.playerId) localStorage.setItem("monopolyPlayerId", res.playerId);
        localStorage.setItem("monopolyRoomCode", code);
        set({ playerId: res.playerId, error: undefined });
      }
    });
  },
  startGame: () => {
    const { socket, room } = get();
    if (!socket || !room) return;
    socket.emit("game:start", { code: room.code });
  },
  action: (type, payload) => {
    const { socket, room, playerId } = get();
    if (!socket || !room || !playerId) return;
    socket.emit("game:action", { code: room.code, playerId, type, payload }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) set({ error: res.error });
    });
  },
  sendChat: (message) => {
    const { socket, room, playerName } = get();
    if (!socket || !room) return;
    socket.emit("chat:send", { code: room.code, playerName, message });
  },
  saveGame: () => {
    const { socket, room } = get();
    if (!socket || !room) return;
    socket.emit("game:save", { code: room.code });
  },
  loadGame: () => {
    const { socket, room } = get();
    if (!socket || !room) return;
    socket.emit("game:load", { code: room.code });
  }
}));
