export type TileType =
  | "go"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "chest"
  | "jail"
  | "goToJail"
  | "parking";

export type PlayerId = number;
export type TurnPhase = "ROLL" | "BUY" | "MANAGE" | "JAIL";

export type GameAction =
  | "ROLL"
  | "BUY"
  | "SKIP"
  | "END_TURN"
  | "PAY_JAIL"
  | "USE_JAIL_CARD"
  | "BUY_HOUSE"
  | "SELL_HOUSE"
  | "MORTGAGE"
  | "UNMORTGAGE";

export type Tile = {
  index: number;
  name: string;
  type: TileType;
  group?: string;
  groupNumber?: number;
  price?: number;
  color?: string;
  tax?: number;
  housePrice?: number;
  baserent?: number;
  rent1?: number;
  rent2?: number;
  rent3?: number;
  rent4?: number;
  rent5?: number;
};

export type PropertyState = {
  ownerId: PlayerId | null;
  houses: number;
  mortgaged: boolean;
};

export type Player = {
  id: PlayerId;
  clientId: string;
  name: string;
  token: string;
  color: string;
  position: number;
  cash: number;
  inJail: boolean;
  jailTurns: number;
  getOutCards: number;
  bankrupt: boolean;
  connected: boolean;
};

export type GameState = {
  players: Player[];
  board: Tile[];
  properties: Record<number, PropertyState>;
  currentPlayer: PlayerId;
  phase: TurnPhase;
  dice: [number, number] | null;
  rollId?: number;
  doublesCount: number;
  pendingPurchase: number | null;
  housesLeft: number;
  hotelsLeft: number;
  log: string[];
  status: "LOBBY" | "ACTIVE" | "GAME_OVER";
  winner: PlayerId | null;
  lastCard: string | null;
};

export type RoomSummary = {
  roomId: string;
  hostId: string;
  maxUsers: number;
  userCount: number;
  status: GameState["status"];
  invitePath: string;
};

export type ServerEvent =
  | { type: "connection:ready"; clientId: string }
  | { type: "room:joined"; room: RoomSummary; game: GameState; clientId: string }
  | { type: "room:state"; room: RoomSummary; game: GameState }
  | { type: "room:full"; roomId: string }
  | { type: "error"; message: string };

export type ClientEvent =
  | { type: "room:create"; roomId?: string; name: string }
  | { type: "room:join"; roomId: string; name: string }
  | { type: "game:start" }
  | { type: "game:action"; action: GameAction; tileIndex?: number };

export const MAX_ROOM_USERS = 8;
export const STARTING_CASH = 1500;
