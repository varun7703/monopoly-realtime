export type TileType =
  | "go"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "community_chest"
  | "jail"
  | "go_to_jail"
  | "free_parking";

export interface PropertyData {
  color?: string;
  price: number;
  mortgageValue: number;
  houseCost?: number;
  rents: number[];
}

export interface Tile {
  id: number;
  name: string;
  type: TileType;
  propertyData?: PropertyData;
  taxAmount?: number;
}

export interface PlayerState {
  id: string;
  name: string;
  socketId?: string;
  position: number;
  balance: number;
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  doublesCount: number;
  bankrupt: boolean;
  properties: number[];
  railroads: number[];
  utilities: number[];
}

export type CardActionType =
  | "move_to"
  | "move_relative"
  | "collect"
  | "pay_bank"
  | "pay_each_player"
  | "collect_from_each_player"
  | "go_to_jail"
  | "get_out_of_jail"
  | "street_repairs";

export interface Card {
  id: string;
  deck: "chance" | "community";
  text: string;
  action: CardActionType;
  amount?: number;
  position?: number;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offeredPropertyIds: number[];
  requestedPropertyIds: number[];
  offeredMoney: number;
  requestedMoney: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: number;
}

export interface AuctionState {
  tileId: number;
  active: boolean;
  currentBid: number;
  currentBidderId?: string;
  eligiblePlayers: string[];
  passPlayers: string[];
}

export interface GameLogEntry {
  at: number;
  message: string;
}

export interface PropertyLedgerEntry {
  tileId: number;
  ownerId?: string;
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

export interface GameState {
  id: string;
  roomCode: string;
  status: "lobby" | "running" | "finished";
  board: Tile[];
  players: PlayerState[];
  currentPlayerIndex: number;
  turn: number;
  lastDiceRoll?: [number, number];
  chanceDeck: Card[];
  communityDeck: Card[];
  chanceDiscard: Card[];
  communityDiscard: Card[];
  pendingAuction?: AuctionState;
  pendingTrade?: TradeOffer;
  winnerId?: string;
  logs: GameLogEntry[];
  propertyLedger: Record<number, PropertyLedgerEntry>;
  createdAt: number;
  updatedAt: number;
}

export const START_BALANCE = 1500;
export const GO_REWARD = 200;
export const JAIL_FINE = 50;
export const BOARD_SIZE = 40;

export const MONOPOLY_BOARD: Tile[] = [
  { id: 0, name: "GO", type: "go" },
  { id: 1, name: "Ahmedabad", type: "property", propertyData: { color: "brown", price: 60, mortgageValue: 30, houseCost: 50, rents: [2, 10, 30, 90, 160, 250] } },
  { id: 2, name: "Community Chest", type: "community_chest" },
  { id: 3, name: "Surat", type: "property", propertyData: { color: "brown", price: 60, mortgageValue: 30, houseCost: 50, rents: [4, 20, 60, 180, 320, 450] } },
  { id: 4, name: "Income Tax", type: "tax", taxAmount: 200 },
  { id: 5, name: "Northern Railway", type: "railroad", propertyData: { price: 200, mortgageValue: 100, rents: [25, 50, 100, 200] } },
  { id: 6, name: "Jaipur", type: "property", propertyData: { color: "light_blue", price: 100, mortgageValue: 50, houseCost: 50, rents: [6, 30, 90, 270, 400, 550] } },
  { id: 7, name: "Chance", type: "chance" },
  { id: 8, name: "Chandigarh", type: "property", propertyData: { color: "light_blue", price: 100, mortgageValue: 50, houseCost: 50, rents: [6, 30, 90, 270, 400, 550] } },
  { id: 9, name: "Cochin", type: "property", propertyData: { color: "light_blue", price: 120, mortgageValue: 60, houseCost: 50, rents: [8, 40, 100, 300, 450, 600] } },
  { id: 10, name: "Jail / Just Visiting", type: "jail" },
  { id: 11, name: "Agra", type: "property", propertyData: { color: "pink", price: 140, mortgageValue: 70, houseCost: 100, rents: [10, 50, 150, 450, 625, 750] } },
  { id: 12, name: "Electric Company", type: "utility", propertyData: { price: 150, mortgageValue: 75, rents: [4, 10] } },
  { id: 13, name: "Madras", type: "property", propertyData: { color: "pink", price: 140, mortgageValue: 70, houseCost: 100, rents: [10, 50, 150, 450, 625, 750] } },
  { id: 14, name: "Bangalore", type: "property", propertyData: { color: "pink", price: 160, mortgageValue: 80, houseCost: 100, rents: [12, 60, 180, 500, 700, 900] } },
  { id: 15, name: "Western Railway", type: "railroad", propertyData: { price: 200, mortgageValue: 100, rents: [25, 50, 100, 200] } },
  { id: 16, name: "Lucknow", type: "property", propertyData: { color: "orange", price: 180, mortgageValue: 90, houseCost: 100, rents: [14, 70, 200, 550, 750, 950] } },
  { id: 17, name: "Community Chest", type: "community_chest" },
  { id: 18, name: "Bhopal", type: "property", propertyData: { color: "orange", price: 180, mortgageValue: 90, houseCost: 100, rents: [14, 70, 200, 550, 750, 950] } },
  { id: 19, name: "Indore", type: "property", propertyData: { color: "orange", price: 200, mortgageValue: 100, houseCost: 100, rents: [16, 80, 220, 600, 800, 1000] } },
  { id: 20, name: "Free Parking", type: "free_parking" },
  { id: 21, name: "Pune", type: "property", propertyData: { color: "red", price: 220, mortgageValue: 110, houseCost: 150, rents: [18, 90, 250, 700, 875, 1050] } },
  { id: 22, name: "Chance", type: "chance" },
  { id: 23, name: "Hyderabad", type: "property", propertyData: { color: "red", price: 220, mortgageValue: 110, houseCost: 150, rents: [18, 90, 250, 700, 875, 1050] } },
  { id: 24, name: "Kolkata", type: "property", propertyData: { color: "red", price: 240, mortgageValue: 120, houseCost: 150, rents: [20, 100, 300, 750, 925, 1100] } },
  { id: 25, name: "Eastern Railway", type: "railroad", propertyData: { price: 200, mortgageValue: 100, rents: [25, 50, 100, 200] } },
  { id: 26, name: "Goa", type: "property", propertyData: { color: "yellow", price: 260, mortgageValue: 130, houseCost: 150, rents: [22, 110, 330, 800, 975, 1150] } },
  { id: 27, name: "Amritsar", type: "property", propertyData: { color: "yellow", price: 260, mortgageValue: 130, houseCost: 150, rents: [22, 110, 330, 800, 975, 1150] } },
  { id: 28, name: "Water Works", type: "utility", propertyData: { price: 150, mortgageValue: 75, rents: [4, 10] } },
  { id: 29, name: "Nagpur", type: "property", propertyData: { color: "yellow", price: 280, mortgageValue: 140, houseCost: 150, rents: [24, 120, 360, 850, 1025, 1200] } },
  { id: 30, name: "Go To Jail", type: "go_to_jail" },
  { id: 31, name: "Noida", type: "property", propertyData: { color: "green", price: 300, mortgageValue: 150, houseCost: 200, rents: [26, 130, 390, 900, 1100, 1275] } },
  { id: 32, name: "Mumbai", type: "property", propertyData: { color: "green", price: 300, mortgageValue: 150, houseCost: 200, rents: [26, 130, 390, 900, 1100, 1275] } },
  { id: 33, name: "Community Chest", type: "community_chest" },
  { id: 34, name: "Delhi", type: "property", propertyData: { color: "green", price: 320, mortgageValue: 160, houseCost: 200, rents: [28, 150, 450, 1000, 1200, 1400] } },
  { id: 35, name: "Southern Railway", type: "railroad", propertyData: { price: 200, mortgageValue: 100, rents: [25, 50, 100, 200] } },
  { id: 36, name: "Chance", type: "chance" },
  { id: 37, name: "Bengaluru CBD", type: "property", propertyData: { color: "dark_blue", price: 350, mortgageValue: 175, houseCost: 200, rents: [35, 175, 500, 1100, 1300, 1500] } },
  { id: 38, name: "Luxury Tax", type: "tax", taxAmount: 100 },
  { id: 39, name: "New Delhi", type: "property", propertyData: { color: "dark_blue", price: 400, mortgageValue: 200, houseCost: 200, rents: [50, 200, 600, 1400, 1700, 2000] } }
];

export const COLOR_SET_COUNTS: Record<string, number> = {
  brown: 2,
  light_blue: 3,
  pink: 3,
  orange: 3,
  red: 3,
  yellow: 3,
  green: 3,
  dark_blue: 2
};
