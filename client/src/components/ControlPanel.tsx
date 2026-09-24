import type { GameState, Player, Tile } from "@monopoly/shared";
import { ownedTiles, ownsFullGroup } from "@monopoly/shared";

type ControlPanelProps = {
  busy: boolean;
  rolling: boolean;
  game: GameState;
  me: Player | null;
  isMyTurn: boolean;
  isHost: boolean;
  pendingTile: Tile | null;
  selectedTile: number | null;
  onSelectTile: (index: number | null) => void;
  onStart: () => void;
  onRoll: () => void;
  onBuy: () => void;
  onSkip: () => void;
  onEndTurn: () => void;
  onPayJail: () => void;
  onUseJailCard: () => void;
  onBuyHouse: (index: number) => void;
  onSellHouse: (index: number) => void;
  onMortgage: (index: number) => void;
  onUnmortgage: (index: number) => void;
  tab: "buy" | "manage";
  onTab: (tab: "buy" | "manage") => void;
};

export function ControlPanel(props: ControlPanelProps) {
  const {
    game,
    me,
    isMyTurn,
    isHost,
    pendingTile,
    selectedTile,
    onSelectTile,
    onStart,
    onRoll,
    onBuy,
    onSkip,
    onEndTurn,
    onPayJail,
    onUseJailCard,
    onBuyHouse,
    onSellHouse,
    onMortgage,
    onUnmortgage,
    tab,
    onTab,
  } = props;

  const current = game.players.find((player) => player.id === game.currentPlayer) ?? null;
  const myProps = me ? ownedTiles(game, me.id) : [];

  if (game.status === "LOBBY") {
    return (
      <div className="control-box">
        <span className="eyebrow">THE TABLE IS OPEN</span>
        <h2>Gather your crew</h2>
        <div className="waiting-dots" aria-hidden="true"><i /><i /><i /></div>
        <p>{game.players.length < 2 ? "Need at least 2 players." : "Host can start when ready."}</p>
        <button className="control-btn" disabled={props.busy || !isHost || game.players.length < 2} onClick={onStart}>
          Start Game
        </button>
      </div>
    );
  }

  if (game.status === "GAME_OVER") {
    const winner = game.players.find((player) => player.id === game.winner);
    return (
      <div className="control-box">
        <h2>{winner ? `${winner.name} wins!` : "Game over"}</h2>
        <p>Create a new room for another match.</p>
      </div>
    );
  }

  return (
    <fieldset className="control-box" disabled={props.busy} aria-busy={props.busy}>
      <div className="turn-status" role="status">
        <span className={`status-dot ${!isMyTurn || props.busy ? "pulsing" : ""}`} />
        {props.rolling ? "Dice in motion…" : props.busy ? "Updating the table…" : isMyTurn ? "Your move. Make it count." : `${current?.name ?? "Player"} is taking their turn`}
      </div>
      <div className="control-menu">
        <button className={tab === "buy" ? "active" : ""} onClick={() => onTab("buy")}>
          Buy
        </button>
        <button className={tab === "manage" ? "active" : ""} onClick={() => onTab("manage")}>
          Manage
        </button>
      </div>

      <div className="quickstats" style={{ borderColor: current?.color ?? "#2563eb" }}>
        <div>{current?.name ?? "—"}</div>
        <div>${current?.cash ?? 0}</div>
      </div>

      {game.dice && !props.rolling && (
        <div className="die-row">
          <b className="mini-die" aria-label={`Die ${game.dice[0]}`}>{["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][game.dice[0]]}</b>
          <b className="mini-die" aria-label={`Die ${game.dice[1]}`}>{["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][game.dice[1]]}</b>
          <span>Total <strong>{game.dice[0] + game.dice[1]}</strong></span>
        </div>
      )}

      {tab === "buy" ? (
        <div className="buy-pane">
          <div className="alert-box">
            {game.log.slice(0, 6).map((entry, index) => (
              <div key={`${entry}-${index}`}>{entry}</div>
            ))}
          </div>
          <div className="landed-box">
            {pendingTile ? (
              <p>
                Landed on <strong>{pendingTile.name}</strong> — ${pendingTile.price}
              </p>
            ) : current ? (
              <p>
                {current.name} is on <strong>{game.board[current.position].name}</strong>
              </p>
            ) : null}
            {game.lastCard && <p className="card-note">{game.lastCard}</p>}
          </div>
        </div>
      ) : (
        <div className="manage-pane">
          <div className="bank-buildings">
            Houses left: {game.housesLeft} · Hotels left: {game.hotelsLeft}
          </div>
          <div className="owned-list">
            {myProps.length === 0 && <p>You do not own any properties yet.</p>}
            {myProps.map((tile) => {
              const prop = game.properties[tile.index];
              const selected = selectedTile === tile.index;
              return (
                <button
                  key={tile.index}
                  className={`owned-row ${selected ? "selected" : ""} ${prop?.mortgaged ? "mortgaged" : ""}`}
                  onClick={() => onSelectTile(tile.index)}
                  disabled={!isMyTurn || !me}
                >
                  <span className="swatch" style={{ background: tile.color ?? "#999" }} />
                  <span>
                    {tile.name}
                    {prop && prop.houses > 0 ? ` · ${prop.houses === 5 ? "Hotel" : `${prop.houses} house(s)`}` : ""}
                    {prop?.mortgaged ? " · mortgaged" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedTile !== null && me && isMyTurn && (
            <ManageActions
              game={game}
              me={me}
              tileIndex={selectedTile}
              onBuyHouse={onBuyHouse}
              onSellHouse={onSellHouse}
              onMortgage={onMortgage}
              onUnmortgage={onUnmortgage}
            />
          )}
        </div>
      )}

      <div className="control-actions">
        {game.phase === "JAIL" && isMyTurn && (
          <>
            <button className="control-btn" onClick={onRoll}>
              Roll for doubles
            </button>
            <button className="control-btn secondary" onClick={onPayJail}>
              Pay $50
            </button>
            {me && me.getOutCards > 0 && (
              <button className="control-btn secondary" onClick={onUseJailCard}>
                Use jail card
              </button>
            )}
          </>
        )}
        {game.phase === "ROLL" && (
          <button className="control-btn" disabled={!isMyTurn} onClick={onRoll}>
            {isMyTurn ? "Roll Dice" : "Waiting…"}
          </button>
        )}
        {game.phase === "BUY" && pendingTile && (
          <>
            <button className="control-btn" disabled={!isMyTurn} onClick={onBuy}>
              Buy (${pendingTile.price})
            </button>
            <button className="control-btn secondary" disabled={!isMyTurn} onClick={onSkip}>
              Decline
            </button>
          </>
        )}
        {game.phase === "MANAGE" && (
          <button className="control-btn" disabled={!isMyTurn} onClick={onEndTurn}>
            End Turn
          </button>
        )}
      </div>
    </fieldset>
  );
}

function ManageActions({
  game,
  me,
  tileIndex,
  onBuyHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
}: {
  game: GameState;
  me: Player;
  tileIndex: number;
  onBuyHouse: (index: number) => void;
  onSellHouse: (index: number) => void;
  onMortgage: (index: number) => void;
  onUnmortgage: (index: number) => void;
}) {
  const tile = game.board[tileIndex];
  const prop = game.properties[tileIndex];
  if (!tile || !prop) return null;

  const canImprove =
    tile.type === "property" &&
    tile.groupNumber !== undefined &&
    ownsFullGroup(game, me.id, tile.groupNumber) &&
    !prop.mortgaged &&
    prop.houses < 5 &&
    Boolean(tile.housePrice) &&
    me.cash >= (tile.housePrice ?? 0);

  const mortgageValue = tile.price ? Math.round(tile.price * 0.5) : 0;
  const unmortgageValue = tile.price ? Math.round(tile.price * 0.6) : 0;

  return (
    <div className="manage-actions">
      <button disabled={!canImprove} onClick={() => onBuyHouse(tileIndex)}>
        Buy house (${tile.housePrice ?? 0})
      </button>
      <button disabled={prop.houses <= 0} onClick={() => onSellHouse(tileIndex)}>
        Sell house
      </button>
      {!prop.mortgaged ? (
        <button disabled={prop.houses > 0 || !tile.price} onClick={() => onMortgage(tileIndex)}>
          Mortgage (${mortgageValue})
        </button>
      ) : (
        <button disabled={me.cash < unmortgageValue} onClick={() => onUnmortgage(tileIndex)}>
          Unmortgage (${unmortgageValue})
        </button>
      )}
    </div>
  );
}
