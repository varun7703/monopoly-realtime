import { board, createEmptyProperties } from "./board.js";
import { chanceCards, communityChestCards, type Card } from "./cards.js";
import type {
  GameAction,
  GameState,
  Player,
  PlayerId,
  PropertyState,
  Tile,
} from "./types.js";
import { STARTING_CASH } from "./types.js";

const colors = ["#ef4444", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#be123c", "#4d7c0f"];
const tokens = ["car", "hat", "ship", "dog", "boot", "cat", "iron", "thimble"];

export function createGame(hostClientId: string, hostName: string): GameState {
  const host = createPlayer(0, hostClientId, hostName);
  return {
    players: [host],
    board,
    properties: createEmptyProperties(),
    currentPlayer: host.id,
    phase: "ROLL",
    dice: null,
    doublesCount: 0,
    pendingPurchase: null,
    housesLeft: 32,
    hotelsLeft: 12,
    log: [`Room created. ${host.name} is the host.`],
    status: "LOBBY",
    winner: null,
    lastCard: null,
  };
}

export function addPlayer(state: GameState, clientId: string, name: string): GameState {
  const existing = state.players.find((player) => player.clientId === clientId);
  if (existing) {
    return setPlayerConnection(state, clientId, true);
  }

  if (state.status !== "LOBBY") {
    return state;
  }

  const next = cloneState(state);
  const id = next.players.length;
  next.players.push(createPlayer(id, clientId, name));
  append(next, `${name} joined the room.`);
  return next;
}

export function setPlayerConnection(state: GameState, clientId: string, connected: boolean): GameState {
  const next = cloneState(state);
  const player = next.players.find((candidate) => candidate.clientId === clientId);
  if (player) {
    player.connected = connected;
    append(next, `${player.name} ${connected ? "reconnected" : "disconnected"}.`);
  }
  return next;
}

export function startGame(state: GameState): GameState {
  const next = cloneState(state);
  if (next.status === "LOBBY" && next.players.length >= 2) {
    next.status = "ACTIVE";
    next.currentPlayer = next.players[0].id;
    next.phase = "ROLL";
    append(next, `${next.players[0].name} starts the game.`);
  }
  return next;
}

export function applyGameAction(state: GameState, clientId: string, action: GameAction, tileIndex?: number): GameState {
  const player = state.players.find((candidate) => candidate.clientId === clientId);
  if (!player || player.id !== state.currentPlayer || state.status !== "ACTIVE" || player.bankrupt) {
    return state;
  }

  switch (action) {
    case "ROLL":
      return rollTurn(state);
    case "BUY":
      return buyPendingProperty(state);
    case "SKIP":
      return skipPendingProperty(state);
    case "END_TURN":
      return endTurnAction(state);
    case "PAY_JAIL":
      return payJail(state);
    case "USE_JAIL_CARD":
      return useJailCard(state);
    case "BUY_HOUSE":
      return tileIndex === undefined ? state : buyHouse(state, tileIndex);
    case "SELL_HOUSE":
      return tileIndex === undefined ? state : sellHouse(state, tileIndex);
    case "MORTGAGE":
      return tileIndex === undefined ? state : mortgageProperty(state, tileIndex);
    case "UNMORTGAGE":
      return tileIndex === undefined ? state : unmortgageProperty(state, tileIndex);
    default:
      return state;
  }
}

export function ownedTiles(state: GameState, playerId: PlayerId): Tile[] {
  return state.board.filter((tile) => state.properties[tile.index]?.ownerId === playerId);
}

export function ownsFullGroup(state: GameState, playerId: PlayerId, groupNumber: number): boolean {
  const groupTiles = state.board.filter((tile) => tile.groupNumber === groupNumber && tile.type === "property");
  return groupTiles.length > 0 && groupTiles.every((tile) => state.properties[tile.index]?.ownerId === playerId);
}

export function getRent(state: GameState, tile: Tile, ownerId: PlayerId, diceTotal: number): number {
  const prop = state.properties[tile.index];
  if (!prop || prop.mortgaged) return 0;

  if (tile.type === "railroad") {
    const count = ownedTiles(state, ownerId).filter((owned) => owned.type === "railroad").length;
    return 25 * 2 ** Math.max(0, count - 1);
  }

  if (tile.type === "utility") {
    const count = ownedTiles(state, ownerId).filter((owned) => owned.type === "utility").length;
    return diceTotal * (count === 2 ? 10 : 4);
  }

  if (tile.type === "property") {
    if (prop.houses === 0) {
      const monopoly = tile.groupNumber !== undefined && ownsFullGroup(state, ownerId, tile.groupNumber);
      return (tile.baserent ?? 0) * (monopoly ? 2 : 1);
    }
    if (prop.houses === 1) return tile.rent1 ?? 0;
    if (prop.houses === 2) return tile.rent2 ?? 0;
    if (prop.houses === 3) return tile.rent3 ?? 0;
    if (prop.houses === 4) return tile.rent4 ?? 0;
    return tile.rent5 ?? 0;
  }

  return 0;
}

function createPlayer(id: PlayerId, clientId: string, name: string): Player {
  return {
    id,
    clientId,
    name: name.trim() || `Player ${id + 1}`,
    token: tokens[id % tokens.length],
    color: colors[id % colors.length],
    position: 0,
    cash: STARTING_CASH,
    inJail: false,
    jailTurns: 0,
    getOutCards: 0,
    bankrupt: false,
    connected: true,
  };
}

function currentPlayer(state: GameState): Player {
  return state.players.find((player) => player.id === state.currentPlayer) ?? state.players[0];
}

function rollTurn(state: GameState): GameState {
  if (state.status !== "ACTIVE") return state;
  if (state.phase !== "ROLL" && state.phase !== "JAIL") return state;

  const dice: [number, number] = [rollDie(), rollDie()];
  const next = cloneState(state);
  next.dice = dice;
  next.rollId = (state.rollId ?? 0) + 1;
  next.lastCard = null;
  const player = currentPlayer(next);
  const isDoubles = dice[0] === dice[1];

  if (player.inJail) {
    return resolveJailRoll(next, player.id, dice, isDoubles);
  }

  if (isDoubles) {
    next.doublesCount += 1;
    if (next.doublesCount >= 3) {
      sendToJail(next, player.id);
      append(next, `${player.name} rolled doubles three times and went to jail.`);
      next.doublesCount = 0;
      next.phase = "MANAGE";
      return next;
    }
  } else {
    next.doublesCount = 0;
  }

  const total = dice[0] + dice[1];
  movePlayer(next, player.id, total, true);
  append(next, `${player.name} rolled ${dice[0]} + ${dice[1]} and landed on ${next.board[player.position].name}.`);
  resolveLanding(next, player.id, total);

  if (next.pendingPurchase !== null) {
    next.phase = "BUY";
  } else if (isDoubles && !player.inJail && next.status === "ACTIVE") {
    next.phase = "ROLL";
    append(next, `${player.name} rolled doubles and may roll again.`);
  } else {
    next.phase = "MANAGE";
  }

  return next;
}

function resolveJailRoll(state: GameState, playerId: PlayerId, dice: [number, number], isDoubles: boolean): GameState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return state;

  if (isDoubles) {
    player.inJail = false;
    player.jailTurns = 0;
    append(state, `${player.name} rolled doubles and left jail.`);
    movePlayer(state, playerId, dice[0] + dice[1], false);
    resolveLanding(state, playerId, dice[0] + dice[1]);
    state.phase = state.pendingPurchase !== null ? "BUY" : "MANAGE";
    state.doublesCount = 0;
    return state;
  }

  player.jailTurns += 1;
  if (player.jailTurns >= 3) {
    chargePlayer(state, playerId, 50);
    player.inJail = false;
    player.jailTurns = 0;
    append(state, `${player.name} paid $50 after three failed jail rolls.`);
    movePlayer(state, playerId, dice[0] + dice[1], false);
    resolveLanding(state, playerId, dice[0] + dice[1]);
    state.phase = state.pendingPurchase !== null ? "BUY" : "MANAGE";
    return state;
  }

  append(state, `${player.name} failed to roll doubles in jail (${player.jailTurns}/3).`);
  state.phase = "MANAGE";
  return state;
}

function payJail(state: GameState): GameState {
  if (state.phase !== "JAIL" && state.phase !== "ROLL") return state;
  const next = cloneState(state);
  const player = currentPlayer(next);
  if (!player.inJail) return state;
  chargePlayer(next, player.id, 50);
  player.inJail = false;
  player.jailTurns = 0;
  append(next, `${player.name} paid $50 to leave jail.`);
  next.phase = "ROLL";
  return next;
}

function useJailCard(state: GameState): GameState {
  const next = cloneState(state);
  const player = currentPlayer(next);
  if (!player.inJail || player.getOutCards <= 0) return state;
  player.getOutCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  append(next, `${player.name} used a Get Out of Jail Free card.`);
  next.phase = "ROLL";
  return next;
}

function buyPendingProperty(state: GameState): GameState {
  if (state.pendingPurchase === null || state.phase !== "BUY") return state;
  const next = cloneState(state);
  const tile = next.board[state.pendingPurchase];
  const player = currentPlayer(next);
  const prop = next.properties[tile.index];

  if (!tile.price || !prop || player.cash < tile.price) {
    append(next, `${player.name} could not buy ${tile.name}.`);
  } else {
    player.cash -= tile.price;
    prop.ownerId = player.id;
    append(next, `${player.name} bought ${tile.name} for $${tile.price}.`);
  }

  next.pendingPurchase = null;
  finishAfterBuy(next, player);
  return next;
}

function skipPendingProperty(state: GameState): GameState {
  if (state.pendingPurchase === null || state.phase !== "BUY") return state;
  const next = cloneState(state);
  const tile = next.board[state.pendingPurchase];
  const player = currentPlayer(next);
  append(next, `${player.name} declined ${tile.name}.`);
  next.pendingPurchase = null;
  finishAfterBuy(next, player);
  return next;
}

function finishAfterBuy(state: GameState, player: Player) {
  const dice = state.dice;
  const isDoubles = Boolean(dice && dice[0] === dice[1] && !player.inJail);
  if (isDoubles && state.doublesCount > 0 && state.doublesCount < 3) {
    state.phase = "ROLL";
    append(state, `${player.name} may roll again (doubles).`);
  } else {
    state.phase = "MANAGE";
  }
}

function endTurnAction(state: GameState): GameState {
  if (state.phase !== "MANAGE") return state;
  if (state.pendingPurchase !== null) return state;
  const next = cloneState(state);
  endTurn(next);
  return next;
}

function buyHouse(state: GameState, tileIndex: number): GameState {
  if (state.phase !== "MANAGE" && state.phase !== "ROLL") return state;
  const next = cloneState(state);
  const player = currentPlayer(next);
  const tile = next.board[tileIndex];
  const prop = next.properties[tileIndex];

  if (!tile || tile.type !== "property" || !prop || prop.ownerId !== player.id || prop.mortgaged) return state;
  if (tile.groupNumber === undefined || !ownsFullGroup(next, player.id, tile.groupNumber)) return state;
  if (!tile.housePrice || player.cash < tile.housePrice) return state;
  if (!canBuildEvenly(next, player.id, tile.groupNumber, tileIndex, 1)) return state;

  if (prop.houses < 4) {
    if (next.housesLeft <= 0) return state;
    prop.houses += 1;
    next.housesLeft -= 1;
    player.cash -= tile.housePrice;
    append(next, `${player.name} built a house on ${tile.name}.`);
  } else if (prop.houses === 4) {
    if (next.hotelsLeft <= 0) return state;
    prop.houses = 5;
    next.housesLeft += 4;
    next.hotelsLeft -= 1;
    player.cash -= tile.housePrice;
    append(next, `${player.name} built a hotel on ${tile.name}.`);
  } else {
    return state;
  }

  return next;
}

function sellHouse(state: GameState, tileIndex: number): GameState {
  if (state.phase !== "MANAGE" && state.phase !== "ROLL") return state;
  const next = cloneState(state);
  const player = currentPlayer(next);
  const tile = next.board[tileIndex];
  const prop = next.properties[tileIndex];

  if (!tile || !prop || prop.ownerId !== player.id || prop.houses <= 0 || !tile.housePrice) return state;
  if (tile.groupNumber === undefined || !canBuildEvenly(next, player.id, tile.groupNumber, tileIndex, -1)) return state;

  if (prop.houses === 5) {
    prop.houses = 4;
    next.hotelsLeft += 1;
    next.housesLeft -= 4;
    if (next.housesLeft < 0) return state;
  } else {
    prop.houses -= 1;
    next.housesLeft += 1;
  }

  player.cash += Math.floor(tile.housePrice / 2);
  append(next, `${player.name} sold a building on ${tile.name}.`);
  return next;
}

function mortgageProperty(state: GameState, tileIndex: number): GameState {
  if (state.phase !== "MANAGE" && state.phase !== "ROLL") return state;
  const next = cloneState(state);
  const player = currentPlayer(next);
  const tile = next.board[tileIndex];
  const prop = next.properties[tileIndex];

  if (!tile?.price || !prop || prop.ownerId !== player.id || prop.mortgaged || prop.houses > 0) return state;
  prop.mortgaged = true;
  player.cash += Math.round(tile.price * 0.5);
  append(next, `${player.name} mortgaged ${tile.name}.`);
  return next;
}

function unmortgageProperty(state: GameState, tileIndex: number): GameState {
  if (state.phase !== "MANAGE" && state.phase !== "ROLL") return state;
  const next = cloneState(state);
  const player = currentPlayer(next);
  const tile = next.board[tileIndex];
  const prop = next.properties[tileIndex];
  if (!tile?.price || !prop || prop.ownerId !== player.id || !prop.mortgaged) return state;

  const cost = Math.round(tile.price * 0.6);
  if (player.cash < cost) return state;
  player.cash -= cost;
  prop.mortgaged = false;
  append(next, `${player.name} unmortgaged ${tile.name}.`);
  return next;
}

function canBuildEvenly(state: GameState, playerId: PlayerId, groupNumber: number, tileIndex: number, delta: number): boolean {
  const group = state.board.filter((tile) => tile.groupNumber === groupNumber && tile.type === "property");
  const levels = group.map((tile) => {
    const houses = state.properties[tile.index]?.houses ?? 0;
    return tile.index === tileIndex ? houses + delta : houses;
  });
  return Math.max(...levels) - Math.min(...levels) <= 1;
}

function movePlayer(state: GameState, playerId: PlayerId, spaces: number, collectGo: boolean) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  const old = player.position;
  player.position = (player.position + spaces + 40) % 40;
  if (collectGo && old + spaces >= 40) {
    player.cash += 200;
    append(state, `${player.name} passed GO and collected $200.`);
  }
}

function advanceTo(state: GameState, playerId: PlayerId, position: number, collectGo: boolean) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  if (collectGo && position < player.position) {
    player.cash += 200;
    append(state, `${player.name} passed GO and collected $200.`);
  }
  player.position = position;
}

function sendToJail(state: GameState, playerId: PlayerId) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesCount = 0;
  state.pendingPurchase = null;
}

function resolveLanding(state: GameState, playerId: PlayerId, diceTotal: number, rentMultiplier = 1) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  const tile = state.board[player.position];

  if (tile.type === "goToJail") {
    sendToJail(state, playerId);
    append(state, `${player.name} was sent to jail.`);
    state.phase = "MANAGE";
    return;
  }

  if (tile.type === "tax") {
    chargePlayer(state, playerId, tile.tax ?? 0);
    append(state, `${player.name} paid $${tile.tax} tax.`);
    return;
  }

  if (tile.type === "chance" || tile.type === "chest") {
    drawCard(state, playerId, tile.type === "chance" ? chanceCards : communityChestCards, tile.type);
    return;
  }

  const prop = state.properties[tile.index];
  if (prop && prop.ownerId === null && tile.price) {
    state.pendingPurchase = tile.index;
    append(state, `${player.name} can buy ${tile.name} for $${tile.price}.`);
    return;
  }

  if (prop && prop.ownerId !== null && prop.ownerId !== playerId && !prop.mortgaged) {
    const owner = state.players.find((candidate) => candidate.id === prop.ownerId);
    const rent = Math.floor(getRent(state, tile, prop.ownerId, diceTotal) * rentMultiplier);
    chargePlayer(state, playerId, rent);
    if (owner) owner.cash += rent;
    append(state, `${player.name} paid $${rent} rent to ${owner?.name ?? "owner"}.`);
  }
}

function drawCard(state: GameState, playerId: PlayerId, deck: Card[], label: string) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  const card = deck[Math.floor(Math.random() * deck.length)];
  state.lastCard = `${label === "chance" ? "Chance" : "Community Chest"}: ${card.text}`;
  append(state, `${player.name} drew — ${state.lastCard}`);
  applyCard(state, playerId, card);
}

function applyCard(state: GameState, playerId: PlayerId, card: Card) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  const effect = card.effect;

  switch (effect.kind) {
    case "cash":
      if (effect.amount >= 0) player.cash += effect.amount;
      else chargePlayer(state, playerId, -effect.amount);
      break;
    case "jailCard":
      player.getOutCards += 1;
      break;
    case "jail":
      sendToJail(state, playerId);
      break;
    case "back":
      movePlayer(state, playerId, -effect.spaces, false);
      resolveLanding(state, playerId, state.dice ? state.dice[0] + state.dice[1] : 0);
      break;
    case "move":
      advanceTo(state, playerId, effect.position, Boolean(effect.collectGo));
      resolveLanding(state, playerId, state.dice ? state.dice[0] + state.dice[1] : 0);
      break;
    case "nearestRailroad": {
      const rails = [5, 15, 25, 35];
      const nextRail = rails.find((index) => index > player.position) ?? rails[0];
      advanceTo(state, playerId, nextRail, nextRail < player.position);
      resolveLanding(state, playerId, state.dice ? state.dice[0] + state.dice[1] : 0, 2);
      break;
    }
    case "nearestUtility": {
      const utils = [12, 28];
      const nextUtil = utils.find((index) => index > player.position) ?? utils[0];
      advanceTo(state, playerId, nextUtil, nextUtil < player.position);
      const prop = state.properties[nextUtil];
      if (prop?.ownerId !== null && prop?.ownerId !== playerId) {
        const roll = rollDie() + rollDie();
        const rent = roll * 10;
        chargePlayer(state, playerId, rent);
        const owner = state.players.find((candidate) => candidate.id === prop.ownerId);
        if (owner) owner.cash += rent;
        append(state, `${player.name} paid $${rent} (10x dice) to ${owner?.name}.`);
      } else {
        resolveLanding(state, playerId, 0);
      }
      break;
    }
    case "repairs": {
      let cost = 0;
      for (const tile of ownedTiles(state, playerId)) {
        const houses = state.properties[tile.index]?.houses ?? 0;
        if (houses === 5) cost += effect.hotel;
        else cost += houses * effect.house;
      }
      chargePlayer(state, playerId, cost);
      append(state, `${player.name} paid $${cost} in repairs.`);
      break;
    }
    case "payEach":
      for (const other of state.players) {
        if (other.id === playerId || other.bankrupt) continue;
        chargePlayer(state, playerId, effect.amount);
        other.cash += effect.amount;
      }
      break;
    case "collectEach":
      for (const other of state.players) {
        if (other.id === playerId || other.bankrupt) continue;
        chargePlayer(state, other.id, effect.amount);
        player.cash += effect.amount;
      }
      break;
  }
}

function chargePlayer(state: GameState, playerId: PlayerId, amount: number) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || amount <= 0) return;
  player.cash -= amount;
  checkBankruptcy(state, playerId);
}

function checkBankruptcy(state: GameState, playerId: PlayerId) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.cash >= 0 || player.bankrupt) return;

  player.bankrupt = true;
  player.inJail = false;
  append(state, `${player.name} is bankrupt.`);

  for (const [index, prop] of Object.entries(state.properties) as [string, PropertyState][]) {
    if (prop.ownerId === playerId) {
      if (prop.houses === 5) {
        state.hotelsLeft += 1;
      } else {
        state.housesLeft += prop.houses;
      }
      prop.ownerId = null;
      prop.houses = 0;
      prop.mortgaged = false;
      void index;
    }
  }

  const active = state.players.filter((candidate) => !candidate.bankrupt);
  if (active.length === 1) {
    state.status = "GAME_OVER";
    state.winner = active[0].id;
    append(state, `${active[0].name} wins the game.`);
  }
}

function endTurn(state: GameState) {
  if (state.status === "GAME_OVER") return;
  const active = state.players.filter((player) => !player.bankrupt);
  if (active.length === 0) return;

  const currentIndex = active.findIndex((player) => player.id === state.currentPlayer);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % active.length;
  const nextPlayer = active[nextIndex];
  state.currentPlayer = nextPlayer.id;
  state.doublesCount = 0;
  state.pendingPurchase = null;
  state.lastCard = null;
  state.phase = nextPlayer.inJail ? "JAIL" : "ROLL";
  append(state, `${nextPlayer.name}'s turn.`);
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    properties: Object.fromEntries(
      Object.entries(state.properties).map(([key, value]) => [key, { ...value }]),
    ),
    dice: state.dice ? [...state.dice] : null,
    log: [...state.log],
  };
}

function append(state: GameState, message: string) {
  state.log = [message, ...state.log].slice(0, 24);
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}
