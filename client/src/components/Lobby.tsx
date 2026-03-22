import { FormEvent, useState } from "react";
import { useGameStore } from "../store/useGameStore";

export const Lobby = () => {
  const { playerName, setName, createRoom, joinRoom, startGame, room, error } = useGameStore();
  const [code, setCode] = useState("");

  const submitJoin = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) joinRoom(code.trim().toUpperCase());
  };

  return (
    <div className="rounded-xl border border-zinc-700 p-4 space-y-4 bg-zinc-900">
      <h2 className="text-xl font-semibold">Lobby</h2>
      <input className="w-full rounded bg-zinc-800 px-3 py-2" value={playerName} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <div className="flex gap-2">
        <button className="rounded bg-blue-600 px-3 py-2" onClick={createRoom}>Create Room</button>
        <form onSubmit={submitJoin} className="flex gap-2">
          <input className="rounded bg-zinc-800 px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Room code" />
          <button className="rounded bg-emerald-600 px-3 py-2">Join</button>
        </form>
      </div>
      {room && (
        <div className="space-y-2">
          <div>Room: <b>{room.code}</b></div>
          <div className="text-sm text-zinc-300">{room.players.map((p) => p.name).join(", ")}</div>
          {!room.game && <button className="rounded bg-purple-600 px-3 py-2" onClick={startGame}>Start Game</button>}
        </div>
      )}
      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
};
