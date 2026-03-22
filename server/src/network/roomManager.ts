import { RuntimeGameState } from "../engine/gameEngine";

export interface LobbyPlayer {
  id: string;
  name: string;
  socketId: string;
  spectator?: boolean;
}

export interface RoomState {
  code: string;
  players: LobbyPlayer[];
  game?: RuntimeGameState;
  chat: Array<{ from: string; message: string; at: number }>;
}

const rooms = new Map<string, RoomState>();

export const getRoom = (code: string) => rooms.get(code);

export const setRoom = (room: RoomState) => {
  rooms.set(room.code, room);
};

export const removeSocketFromRooms = (socketId: string) => {
  const touchedRoomCodes: string[] = [];
  rooms.forEach((room) => {
    const hadPlayer = room.players.some((p) => p.socketId === socketId);
    room.players = room.players.map((p) => (p.socketId === socketId ? { ...p, socketId: "" } : p));
    if (hadPlayer) touchedRoomCodes.push(room.code);
  });
  return touchedRoomCodes;
};

export const allRooms = () => Array.from(rooms.values());
