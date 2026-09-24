import type { GameState } from "@monopoly/shared";
import { PlayerToken } from "./PlayerToken";

export function MoneyBar({
  game,
  clientId,
  onViewStats,
}: {
  game: GameState;
  clientId: string;
  onViewStats: () => void;
}) {
  return (
    <aside className="moneybar">
      {game.players.map((player) => (
        <div
          key={player.id}
          className={`moneybar-row ${player.id === game.currentPlayer ? "is-turn" : ""} ${player.bankrupt ? "is-bankrupt" : ""}`}
          style={{ borderColor: player.color }}
        >
          <PlayerToken token={player.token} color={player.color} name={player.name} active={game.status === "ACTIVE" && player.id === game.currentPlayer} />
          <div>
            <div className="moneybar-name">
              {player.name}
              {player.clientId === clientId ? " (you)" : ""}
              {!player.connected ? " · offline" : ""}
            </div>
            <div className="moneybar-cash">${player.cash}</div>
            {player.getOutCards > 0 && <div className="moneybar-meta">{player.getOutCards} jail card(s)</div>}
            {player.inJail && <div className="moneybar-meta">In jail</div>}
          </div>
        </div>
      ))}
      <button className="stats-btn" onClick={onViewStats}>
        View stats
      </button>
    </aside>
  );
}
