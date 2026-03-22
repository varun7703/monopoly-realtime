import {
  AuctionState,
  BOARD_SIZE,
  Card,
  COLOR_SET_COUNTS,
  GO_REWARD,
  GameState,
  JAIL_FINE,
  MONOPOLY_BOARD,
  PlayerState,
  PropertyLedgerEntry,
  TradeOffer,
  START_BALANCE
} from "../../../shared/src";

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

type DeckType = "chance" | "community";

export interface RuntimeGameState extends GameState {
  pendingAuction?: AuctionState;
  pendingTrade?: TradeOffer;
  activePlayerIds: string[];
}

const CHANCE_CARDS: Card[] = [
  { id: "c1", deck: "chance", text: "Advance to GO", action: "move_to", position: 0 },
  { id: "c2", deck: "chance", text: "Go to Jail", action: "go_to_jail" },
  { id: "c3", deck: "chance", text: "Advance to Kolkata", action: "move_to", position: 24 },
  { id: "c4", deck: "chance", text: "Bank pays you dividend of $50", action: "collect", amount: 50 },
  { id: "c5", deck: "chance", text: "Pay poor tax of $15", action: "pay_bank", amount: 15 },
  { id: "c6", deck: "chance", text: "Get Out of Jail Free", action: "get_out_of_jail" },
  { id: "c7", deck: "chance", text: "Go back 3 spaces", action: "move_relative", amount: -3 },
  { id: "c8", deck: "chance", text: "General repairs", action: "street_repairs", amount: 0 }
];

const COMMUNITY_CARDS: Card[] = [
  { id: "cc1", deck: "community", text: "Advance to GO", action: "move_to", position: 0 },
  { id: "cc2", deck: "community", text: "Bank error in your favor. Collect $200", action: "collect", amount: 200 },
  { id: "cc3", deck: "community", text: "Doctor's fees. Pay $50", action: "pay_bank", amount: 50 },
  { id: "cc4", deck: "community", text: "Go to Jail", action: "go_to_jail" },
  { id: "cc5", deck: "community", text: "From sale of stock you get $50", action: "collect", amount: 50 },
  { id: "cc6", deck: "community", text: "Get Out of Jail Free", action: "get_out_of_jail" },
  { id: "cc7", deck: "community", text: "Grand Opera opening. Collect $50 from every player", action: "collect_from_each_player", amount: 50 },
  { id: "cc8", deck: "community", text: "You are assessed for street repairs", action: "street_repairs", amount: 0 }
];

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
const rollDie = () => Math.floor(Math.random() * 6) + 1;

export const createGame = (roomCode: string, players: Array<{ id: string; name: string; socketId: string }>): RuntimeGameState => {
  const now = Date.now();
  const ledger: Record<number, PropertyLedgerEntry> = {};
  MONOPOLY_BOARD.forEach((tile) => {
    if (tile.propertyData) {
      ledger[tile.id] = { tileId: tile.id, houses: 0, hotel: false, mortgaged: false };
    }
  });
  return {
    id: createId(),
    roomCode,
    status: "running",
    board: MONOPOLY_BOARD,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      socketId: p.socketId,
      position: 0,
      balance: START_BALANCE,
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      doublesCount: 0,
      bankrupt: false,
      properties: [],
      railroads: [],
      utilities: []
    })),
    currentPlayerIndex: 0,
    turn: 1,
    chanceDeck: shuffle(CHANCE_CARDS),
    communityDeck: shuffle(COMMUNITY_CARDS),
    chanceDiscard: [],
    communityDiscard: [],
    logs: [{ at: now, message: "Game started." }],
    createdAt: now,
    updatedAt: now,
    propertyLedger: ledger,
    activePlayerIds: players.map((p) => p.id)
  };
};

export const getCurrentPlayer = (game: RuntimeGameState) => game.players[game.currentPlayerIndex];

const activePlayers = (game: RuntimeGameState) => game.players.filter((p) => !p.bankrupt);

const assertPlayerTurn = (game: RuntimeGameState, playerId: string) => {
  if (getCurrentPlayer(game).id !== playerId) throw new Error("Not your turn.");
};

const movePlayerTo = (game: RuntimeGameState, player: PlayerState, position: number) => {
  if (position < player.position) player.balance += GO_REWARD;
  player.position = position;
};

const moveBy = (game: RuntimeGameState, player: PlayerState, steps: number) => {
  const old = player.position;
  player.position = (player.position + steps + BOARD_SIZE) % BOARD_SIZE;
  if (steps > 0 && player.position < old) player.balance += GO_REWARD;
};

const getPlayerById = (game: RuntimeGameState, id: string) => {
  const player = game.players.find((p) => p.id === id);
  if (!player) throw new Error("Player not found.");
  return player;
};

const hasFullColorSet = (game: RuntimeGameState, playerId: string, color: string) => {
  const owned = Object.values(game.propertyLedger).filter((x) => {
    const tile = game.board[x.tileId];
    return tile.propertyData?.color === color && x.ownerId === playerId;
  }).length;
  return owned === COLOR_SET_COUNTS[color];
};

const rentForTile = (game: RuntimeGameState, tileId: number, diceTotal: number) => {
  const tile = game.board[tileId];
  const ledger = game.propertyLedger[tileId];
  if (!tile.propertyData || !ledger?.ownerId || ledger.mortgaged) return 0;
  if (tile.type === "railroad") {
    const count = game.players.find((p) => p.id === ledger.ownerId)?.railroads.length ?? 0;
    return [25, 50, 100, 200][Math.max(0, count - 1)];
  }
  if (tile.type === "utility") {
    const count = game.players.find((p) => p.id === ledger.ownerId)?.utilities.length ?? 0;
    return (count === 2 ? 10 : 4) * diceTotal;
  }
  const rents = tile.propertyData.rents;
  if (ledger.hotel) return rents[5];
  if (ledger.houses > 0) return rents[ledger.houses];
  const base = rents[0];
  if (tile.propertyData.color && hasFullColorSet(game, ledger.ownerId, tile.propertyData.color)) return base * 2;
  return base;
};

const transfer = (game: RuntimeGameState, fromId: string, toId: string, amount: number) => {
  const from = getPlayerById(game, fromId);
  const to = getPlayerById(game, toId);
  from.balance -= amount;
  to.balance += amount;
};

const bankruptPlayer = (game: RuntimeGameState, player: PlayerState, creditorId?: string) => {
  player.bankrupt = true;
  player.balance = 0;
  if (creditorId) {
    Object.values(game.propertyLedger).forEach((ledger) => {
      if (ledger.ownerId === player.id) ledger.ownerId = creditorId;
    });
  } else {
    Object.values(game.propertyLedger).forEach((ledger) => {
      if (ledger.ownerId === player.id) {
        ledger.ownerId = undefined;
        ledger.houses = 0;
        ledger.hotel = false;
        ledger.mortgaged = false;
      }
    });
  }
  player.properties = [];
  player.railroads = [];
  player.utilities = [];
};

const checkBankruptcy = (game: RuntimeGameState, player: PlayerState, creditorId?: string) => {
  if (player.balance < 0) bankruptPlayer(game, player, creditorId);
};

const drawCard = (game: RuntimeGameState, deckType: DeckType): Card => {
  const deck = deckType === "chance" ? game.chanceDeck : game.communityDeck;
  const discard = deckType === "chance" ? game.chanceDiscard : game.communityDiscard;
  if (deck.length === 0) {
    const recycled = shuffle(discard.splice(0));
    if (deckType === "chance") game.chanceDeck = recycled;
    else game.communityDeck = recycled;
  }
  const activeDeck = deckType === "chance" ? game.chanceDeck : game.communityDeck;
  const card = activeDeck.shift();
  if (!card) throw new Error("Card deck empty.");
  return card;
};

const resolveCard = (game: RuntimeGameState, player: PlayerState, card: Card) => {
  switch (card.action) {
    case "move_to":
      movePlayerTo(game, player, card.position ?? 0);
      break;
    case "move_relative":
      moveBy(game, player, card.amount ?? 0);
      break;
    case "collect":
      player.balance += card.amount ?? 0;
      break;
    case "pay_bank":
      player.balance -= card.amount ?? 0;
      break;
    case "go_to_jail":
      sendToJail(player);
      break;
    case "get_out_of_jail":
      player.getOutOfJailCards += 1;
      break;
    case "collect_from_each_player":
      activePlayers(game)
        .filter((p) => p.id !== player.id)
        .forEach((p) => transfer(game, p.id, player.id, card.amount ?? 0));
      break;
    case "pay_each_player":
      activePlayers(game)
        .filter((p) => p.id !== player.id)
        .forEach((p) => transfer(game, player.id, p.id, card.amount ?? 0));
      break;
    case "street_repairs": {
      const houses = Object.values(game.propertyLedger).filter((x) => x.ownerId === player.id).reduce((a, b) => a + b.houses, 0);
      const hotels = Object.values(game.propertyLedger).filter((x) => x.ownerId === player.id && x.hotel).length;
      player.balance -= houses * 40 + hotels * 115;
      break;
    }
  }
  const discard = card.deck === "chance" ? game.chanceDiscard : game.communityDiscard;
  if (card.action !== "get_out_of_jail") discard.push(card);
};

const sendToJail = (player: PlayerState) => {
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  player.doublesCount = 0;
};

const updatePlayerLists = (game: RuntimeGameState) => {
  game.players.forEach((p) => {
    p.properties = [];
    p.railroads = [];
    p.utilities = [];
  });
  Object.values(game.propertyLedger).forEach((entry) => {
    if (!entry.ownerId) return;
    const owner = getPlayerById(game, entry.ownerId);
    const tile = game.board[entry.tileId];
    if (tile.type === "railroad") owner.railroads.push(entry.tileId);
    else if (tile.type === "utility") owner.utilities.push(entry.tileId);
    else owner.properties.push(entry.tileId);
  });
};

export const rollAndMove = (game: RuntimeGameState, playerId: string) => {
  assertPlayerTurn(game, playerId);
  const player = getPlayerById(game, playerId);
  if (player.bankrupt) throw new Error("Bankrupt players cannot move.");
  const d1 = rollDie();
  const d2 = rollDie();
  game.lastDiceRoll = [d1, d2];
  const isDouble = d1 === d2;

  if (player.inJail) {
    player.jailTurns += 1;
    if (isDouble) {
      player.inJail = false;
      player.jailTurns = 0;
    } else if (player.jailTurns >= 3) {
      player.balance -= JAIL_FINE;
      player.inJail = false;
      player.jailTurns = 0;
    } else {
      endTurn(game, false);
      return game;
    }
  }

  if (isDouble) player.doublesCount += 1;
  else player.doublesCount = 0;

  if (player.doublesCount === 3) {
    sendToJail(player);
    endTurn(game, false);
    return game;
  }

  moveBy(game, player, d1 + d2);
  resolveTile(game, player, d1 + d2);
  checkBankruptcy(game, player);
  if (player.bankrupt) endTurn(game, false);
  else if (isDouble) game.logs.push({ at: Date.now(), message: `${player.name} rolled doubles and plays again.` });
  else endTurn(game, false);
  finalizeTurn(game);
  return game;
};

const resolveTile = (game: RuntimeGameState, player: PlayerState, diceTotal: number) => {
  const tile = game.board[player.position];
  if (tile.type === "go_to_jail") {
    sendToJail(player);
    return;
  }
  if (tile.type === "tax") {
    player.balance -= tile.taxAmount ?? 0;
    return;
  }
  if (tile.type === "chance" || tile.type === "community_chest") {
    const card = drawCard(game, tile.type === "chance" ? "chance" : "community");
    game.logs.push({ at: Date.now(), message: `${player.name} drew: ${card.text}` });
    resolveCard(game, player, card);
    return;
  }
  if (!tile.propertyData) return;
  const ledger = game.propertyLedger[tile.id];
  if (!ledger.ownerId) return;
  if (ledger.ownerId === player.id) return;
  const rent = rentForTile(game, tile.id, diceTotal);
  transfer(game, player.id, ledger.ownerId, rent);
  checkBankruptcy(game, player, ledger.ownerId);
};

export const buyCurrentProperty = (game: RuntimeGameState, playerId: string) => {
  assertPlayerTurn(game, playerId);
  const player = getPlayerById(game, playerId);
  const tile = game.board[player.position];
  if (!tile.propertyData) throw new Error("No purchasable property.");
  const ledger = game.propertyLedger[tile.id];
  if (ledger.ownerId) throw new Error("Property already owned.");
  if (player.balance < tile.propertyData.price) throw new Error("Insufficient funds.");
  player.balance -= tile.propertyData.price;
  ledger.ownerId = player.id;
  updatePlayerLists(game);
};

export const startAuction = (game: RuntimeGameState, playerId: string) => {
  assertPlayerTurn(game, playerId);
  const tile = game.board[getPlayerById(game, playerId).position];
  if (!tile.propertyData) throw new Error("No property to auction.");
  const ledger = game.propertyLedger[tile.id];
  if (ledger.ownerId) throw new Error("Cannot auction owned property.");
  game.pendingAuction = {
    tileId: tile.id,
    active: true,
    currentBid: 0,
    eligiblePlayers: activePlayers(game).map((p) => p.id),
    passPlayers: []
  };
};

export const placeBid = (game: RuntimeGameState, playerId: string, bid: number) => {
  const auction = game.pendingAuction;
  if (!auction?.active) throw new Error("No active auction.");
  const player = getPlayerById(game, playerId);
  if (auction.passPlayers.includes(playerId)) throw new Error("Player already passed.");
  if (bid <= auction.currentBid) throw new Error("Bid must be higher.");
  if (player.balance < bid) throw new Error("Insufficient funds for bid.");
  auction.currentBid = bid;
  auction.currentBidderId = playerId;
};

export const passBid = (game: RuntimeGameState, playerId: string) => {
  const auction = game.pendingAuction;
  if (!auction?.active) throw new Error("No active auction.");
  if (!auction.passPlayers.includes(playerId)) auction.passPlayers.push(playerId);
  const remaining = auction.eligiblePlayers.filter((id) => !auction.passPlayers.includes(id));
  if (remaining.length <= 1) {
    const winnerId = auction.currentBidderId ?? remaining[0];
    if (winnerId) {
      const winner = getPlayerById(game, winnerId);
      winner.balance -= auction.currentBid;
      game.propertyLedger[auction.tileId].ownerId = winnerId;
      updatePlayerLists(game);
    }
    game.pendingAuction = undefined;
    endTurn(game, true);
  }
};

export const buildHouse = (game: RuntimeGameState, playerId: string, tileId: number) => {
  const entry = game.propertyLedger[tileId];
  if (!entry || entry.ownerId !== playerId) throw new Error("You do not own this property.");
  const tile = game.board[tileId];
  if (tile.type !== "property" || !tile.propertyData?.color) throw new Error("Cannot build here.");
  if (!hasFullColorSet(game, playerId, tile.propertyData.color)) throw new Error("Full color set required.");
  const setTiles = game.board.filter((t) => t.type === "property" && t.propertyData?.color === tile.propertyData?.color).map((t) => t.id);
  const minHouses = Math.min(...setTiles.map((id) => game.propertyLedger[id].houses + (game.propertyLedger[id].hotel ? 5 : 0)));
  const current = entry.houses + (entry.hotel ? 5 : 0);
  if (current > minHouses) throw new Error("Must build evenly.");
  const owner = getPlayerById(game, playerId);
  const cost = tile.propertyData.houseCost ?? 0;
  if (owner.balance < cost) throw new Error("Insufficient funds.");
  owner.balance -= cost;
  if (entry.houses < 4) entry.houses += 1;
  else {
    entry.houses = 0;
    entry.hotel = true;
  }
};

export const mortgageProperty = (game: RuntimeGameState, playerId: string, tileId: number) => {
  const entry = game.propertyLedger[tileId];
  if (!entry || entry.ownerId !== playerId) throw new Error("Not owner.");
  if (entry.houses > 0 || entry.hotel) throw new Error("Sell buildings first.");
  if (entry.mortgaged) throw new Error("Already mortgaged.");
  entry.mortgaged = true;
  const tile = game.board[tileId];
  getPlayerById(game, playerId).balance += tile.propertyData?.mortgageValue ?? 0;
};

export const unmortgageProperty = (game: RuntimeGameState, playerId: string, tileId: number) => {
  const entry = game.propertyLedger[tileId];
  if (!entry || entry.ownerId !== playerId) throw new Error("Not owner.");
  if (!entry.mortgaged) throw new Error("Not mortgaged.");
  const tile = game.board[tileId];
  const amount = Math.ceil((tile.propertyData?.mortgageValue ?? 0) * 1.1);
  const player = getPlayerById(game, playerId);
  if (player.balance < amount) throw new Error("Insufficient funds.");
  player.balance -= amount;
  entry.mortgaged = false;
};

export const proposeTrade = (
  game: RuntimeGameState,
  fromPlayerId: string,
  toPlayerId: string,
  offeredPropertyIds: number[],
  requestedPropertyIds: number[],
  offeredMoney: number,
  requestedMoney: number
) => {
  offeredPropertyIds.forEach((id) => {
    if (game.propertyLedger[id]?.ownerId !== fromPlayerId) throw new Error("Offered property not owned.");
  });
  requestedPropertyIds.forEach((id) => {
    if (game.propertyLedger[id]?.ownerId !== toPlayerId) throw new Error("Requested property not owned.");
  });
  game.pendingTrade = {
    id: createId(),
    fromPlayerId,
    toPlayerId,
    offeredPropertyIds,
    requestedPropertyIds,
    offeredMoney,
    requestedMoney,
    status: "pending",
    createdAt: Date.now()
  };
};

export const respondTrade = (game: RuntimeGameState, playerId: string, accept: boolean) => {
  const trade = game.pendingTrade;
  if (!trade || trade.toPlayerId !== playerId) throw new Error("No trade to respond.");
  if (!accept) {
    trade.status = "rejected";
    game.pendingTrade = undefined;
    return;
  }
  const from = getPlayerById(game, trade.fromPlayerId);
  const to = getPlayerById(game, trade.toPlayerId);
  if (from.balance < trade.offeredMoney || to.balance < trade.requestedMoney) throw new Error("Insufficient trade funds.");
  from.balance -= trade.offeredMoney;
  to.balance += trade.offeredMoney;
  to.balance -= trade.requestedMoney;
  from.balance += trade.requestedMoney;
  trade.offeredPropertyIds.forEach((id) => (game.propertyLedger[id].ownerId = to.id));
  trade.requestedPropertyIds.forEach((id) => (game.propertyLedger[id].ownerId = from.id));
  updatePlayerLists(game);
  trade.status = "accepted";
  game.pendingTrade = undefined;
};

export const useGetOutOfJailCard = (game: RuntimeGameState, playerId: string) => {
  const player = getPlayerById(game, playerId);
  if (!player.inJail || player.getOutOfJailCards <= 0) throw new Error("Cannot use card.");
  player.getOutOfJailCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;
};

export const payJailFine = (game: RuntimeGameState, playerId: string) => {
  const player = getPlayerById(game, playerId);
  if (!player.inJail) throw new Error("Player is not in jail.");
  if (player.balance < JAIL_FINE) throw new Error("Insufficient funds.");
  player.balance -= JAIL_FINE;
  player.inJail = false;
  player.jailTurns = 0;
};

export const endTurn = (game: RuntimeGameState, fromAuction: boolean) => {
  const current = getCurrentPlayer(game);
  if (!fromAuction && !current.bankrupt && current.doublesCount > 0 && game.lastDiceRoll && game.lastDiceRoll[0] === game.lastDiceRoll[1]) {
    return;
  }
  current.doublesCount = 0;
  let next = game.currentPlayerIndex;
  do next = (next + 1) % game.players.length;
  while (game.players[next].bankrupt);
  game.currentPlayerIndex = next;
  game.turn += 1;
  game.updatedAt = Date.now();
};

const finalizeTurn = (game: RuntimeGameState) => {
  updatePlayerLists(game);
  const alive = activePlayers(game);
  if (alive.length === 1) {
    game.status = "finished";
    game.winnerId = alive[0].id;
  }
};
