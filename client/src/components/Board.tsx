import type { GameState, Tile } from "@monopoly/shared";

const TOKEN_SRC: Record<string, string> = {
  car: "/images/monopoly_token_car.png",
  hat: "/images/monopoly_token_hat.png",
  ship: "/images/monopoly_token_ship.png",
  dog: "/images/monopoly_token_dog.png",
  boot: "/images/monopoly_token_boot.png",
  cat: "/images/monopoly_token_dog.png",
  iron: "/images/monopoly_token_iron.png",
  thimble: "/images/monopoly_token_thimble.png",
};

const ICON: Partial<Record<Tile["type"], string>> = {
  chance: "/images/chance_icon.png",
  chest: "/images/community_chest_icon.png",
  railroad: "/images/train_icon.png",
  parking: "/images/free_parking_icon.png",
  tax: "/images/tax_icon.png",
};

type BoardProps = {
  game: GameState;
  onHoverTile: (tile: Tile | null) => void;
};

export function Board({ game, onHoverTile }: BoardProps) {
  const top = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
  const bottom = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const left = [19, 18, 17, 16, 15, 14, 13, 12, 11];
  const right = [31, 32, 33, 34, 35, 36, 37, 38, 39];

  return (
    <div className="classic-board" aria-label="Monopoly board">
      <div className="board-row">
        {top.map((index) => (
          <BoardCell key={index} game={game} index={index} edge="top" onHoverTile={onHoverTile} />
        ))}
      </div>

      <div className="board-mid">
        <div className="board-col">
          {left.map((index) => (
            <BoardCell key={index} game={game} index={index} edge="left" onHoverTile={onHoverTile} />
          ))}
        </div>

        <div className="board-center-panel">
          <div className="center-brand">MONOPOLY</div>
          <p>Classic board · online rooms · share the invite link</p>
          {game.dice && (
            <div className="center-dice">
              <img src={`/images/Die_${game.dice[0]}.png`} alt={`Die ${game.dice[0]}`} />
              <img src={`/images/Die_${game.dice[1]}.png`} alt={`Die ${game.dice[1]}`} />
            </div>
          )}
          {game.lastCard && <p className="center-card">{game.lastCard}</p>}
        </div>

        <div className="board-col">
          {right.map((index) => (
            <BoardCell key={index} game={game} index={index} edge="right" onHoverTile={onHoverTile} />
          ))}
        </div>
      </div>

      <div className="board-row">
        {bottom.map((index) => (
          <BoardCell key={index} game={game} index={index} edge="bottom" onHoverTile={onHoverTile} />
        ))}
      </div>
    </div>
  );
}

function BoardCell({
  game,
  index,
  edge,
  onHoverTile,
}: {
  game: GameState;
  index: number;
  edge: "top" | "bottom" | "left" | "right";
  onHoverTile: (tile: Tile | null) => void;
}) {
  const tile = game.board[index];
  const prop = game.properties[index];
  const owner = prop?.ownerId !== null && prop?.ownerId !== undefined ? game.players.find((player) => player.id === prop.ownerId) : null;
  const occupants = game.players.filter((player) => player.position === index && !player.bankrupt);
  const isCorner = index % 10 === 0;
  const icon = tile.type === "utility" ? (index === 12 ? "/images/electric_icon.png" : "/images/water_icon.png") : ICON[tile.type];

  return (
    <div
      className={`board-cell edge-${edge} ${isCorner ? "is-corner" : ""} type-${tile.type} ${prop?.mortgaged ? "is-mortgaged" : ""}`}
      onMouseEnter={() => onHoverTile(tile)}
      onMouseLeave={() => onHoverTile(null)}
    >
      {tile.color && tile.type === "property" && (
        <span
          className={`color-strip strip-${edge === "top" ? "bottom" : edge === "bottom" ? "top" : edge === "left" ? "right" : "left"}`}
          style={{ background: tile.color }}
        />
      )}
      {owner && <span className="owner-bar" style={{ background: owner.color }} title={`Owned by ${owner.name}`} />}
      <div className="cell-body">
        <strong>{shortName(tile.name)}</strong>
        {tile.price ? <small>${tile.price}</small> : null}
        {icon ? <img className="cell-icon" src={icon} alt="" /> : null}
        {prop && prop.houses > 0 && (
          <div className="building-row">
            {prop.houses === 5 ? (
              <img src="/images/hotel.png" alt="hotel" />
            ) : (
              Array.from({ length: prop.houses }).map((_, houseIndex) => (
                <img key={houseIndex} src="/images/house.png" alt="house" />
              ))
            )}
          </div>
        )}
      </div>
      <div className="token-stack">
        {occupants.map((player) => (
          <img
            key={player.id}
            className="token-img"
            src={TOKEN_SRC[player.token] ?? TOKEN_SRC.car}
            alt={player.name}
            title={`${player.name}${player.inJail && index === 10 ? " (jail)" : ""}`}
            style={{ outlineColor: player.color }}
          />
        ))}
      </div>
    </div>
  );
}

function shortName(name: string) {
  if (name.length <= 14) return name;
  return `${name.slice(0, 12)}…`;
}
