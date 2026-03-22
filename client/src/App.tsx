import { useEffect } from "react";
import { ActionPanel } from "./components/ActionPanel";
import { Board } from "./components/Board";
import { Lobby } from "./components/Lobby";
import { useGameStore } from "./store/useGameStore";

export default function App() {
  const { connect, room } = useGameStore();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="mx-auto max-w-7xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">Monopoly Realtime</h1>
      <Lobby />
      {room?.game && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Board />
          </div>
          <div className="space-y-4">
            <ActionPanel />
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
              <h3 className="text-lg font-semibold mb-2">Players</h3>
              <div className="space-y-1 text-sm">
                {room.game.players.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{p.name}{p.bankrupt ? " (Bankrupt)" : ""}</span>
                    <span>${p.balance}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
              <h3 className="text-lg font-semibold mb-2">Game Log</h3>
              <div className="max-h-44 overflow-auto text-xs space-y-1 text-zinc-300">
                {room.game.logs.slice(-20).map((l) => (
                  <p key={l.at + l.message}>{new Date(l.at).toLocaleTimeString()} - {l.message}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
