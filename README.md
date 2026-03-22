# Monopoly Realtime (React + Node + Socket.io + MongoDB)

Production-oriented, server-authoritative browser Monopoly game with multiplayer lobbies, persistent save/load, auctions, jail logic, cards, mortgages, building rules, and trading.

## 1) Architecture Overview

- `shared`: Monopoly board constants + TypeScript contracts for game state.
- `server`: authoritative game engine (pure-ish logic), Socket.io networking layer, Mongo persistence.
- `client`: React + Zustand + Tailwind UI with real-time room/game sync.

Design principles:
- Server owns all state transitions (anti-cheat).
- Frontend emits intents only (`ROLL`, `BUY_PROPERTY`, `PLACE_BID`, etc.).
- Engine code remains isolated from transport layer.

## 2) Folder Structure

```txt
.
├─ client/
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ ActionPanel.tsx
│  │  │  ├─ Board.tsx
│  │  │  └─ Lobby.tsx
│  │  ├─ store/useGameStore.ts
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  └─ styles.css
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.ts
├─ server/
│  ├─ src/
│  │  ├─ engine/gameEngine.ts
│  │  ├─ models/SavedGame.ts
│  │  ├─ network/roomManager.ts
│  │  ├─ network/socketHandlers.ts
│  │  └─ index.ts
│  └─ package.json
├─ shared/
│  ├─ src/index.ts
│  └─ package.json
├─ docker-compose.yml
└─ package.json
```

## 3) Game State Schema

Core state lives in `RuntimeGameState`:
- Immutable board metadata + mutable per-tile ledger (owner, houses/hotel, mortgage).
- Players with balances, jail counters, cards, bankruptcy state.
- Turn index and dice state.
- Chance/Community deck + discard pile.
- Auction and trade pending state objects.
- Log stream and end-game winner.

## 4) Backend API + WebSocket Events

HTTP:
- `GET /health`

Socket.io:
- Room: `room:create`, `room:join`, `room:reconnect`, `room:state`
- Game lifecycle: `game:start`, `game:save`, `game:load`
- Game action dispatch: `game:action` with action types:
  - `ROLL`, `BUY_PROPERTY`, `START_AUCTION`, `PLACE_BID`, `PASS_BID`
  - `BUILD_HOUSE`, `MORTGAGE`, `UNMORTGAGE`
  - `PROPOSE_TRADE`, `RESPOND_TRADE`
  - `USE_JAIL_CARD`, `PAY_JAIL_FINE`, `END_TURN`
- Chat: `chat:send`, `chat:update`

## 5) Monopoly Rules Implemented

- 2-dice turns, doubles logic, triple-double jail.
- Passing GO rewards.
- Jail: enter/exit via doubles, card, or fine.
- Property buy flow + auction fallback.
- Rent: base, monopoly multiplier, houses/hotels, utilities, railroads.
- Mortgage/unmortgage.
- Even building rule enforcement for color sets.
- Chance/Community draw, shuffle, recycle.
- Bankruptcy and asset transfer handling.
- Player-to-player trade proposals and acceptance/rejection.

## 6) Local Setup

### Prerequisites
- Node.js 20+
- MongoDB local instance

### Install
```bash
npm install
```

### Environment
Server defaults:
- `PORT=4000`
- `MONGO_URI=mongodb://127.0.0.1:27017/monopoly`

Client optional:
- `VITE_SERVER_URL=http://localhost:4000`

Atlas setup:
1. Copy `.env.example` to `.env`.
2. Put your Atlas URI in `MONGO_URI`.
3. In Atlas Network Access, allow your current IP.
4. In Atlas Database Access, ensure the username/password in URI is valid.

### Run dev
```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:4000`

## 7) Deployment Guidance

- Build all packages:
```bash
npm run build
```

- Run server:
```bash
npm run start
```

- For containerized dev/prod-style startup:
```bash
docker compose up --build
```

Recommended production setup:
- Host server behind Nginx or cloud load balancer.
- Use managed MongoDB.
- Use sticky WebSocket sessions or Socket.io adapter for horizontal scaling.
- Persist room/game state snapshots for recovery on restart.
