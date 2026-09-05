# Monopoly Online Rooms

Realtime Monopoly with classic-style board UI and shareable online lobbies.

Frontend look and classic rules are adapted from [u7ter/React-monopoly](https://github.com/u7ter/React-monopoly) (classic US edition board, deeds, houses/hotels, jail, chance/community chest). Multiplayer rooms are server-authoritative over WebSockets.

## Workspaces

- `client` — Vite + React UI
- `server` — Express + `ws` room server
- `shared` — board data and game rules

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

- Vite proxies `/ws` to the room server on port `3001`
- On a LAN, open `http://YOUR_IP:5173/` from other devices

## Share a lobby

1. Host clicks **Host lobby** (optional custom room code, or leave blank to auto-generate)
2. Copy the invite link from the banner (`/?room=CODE`)
3. Friends open the link, enter a name, and join
4. Host starts when at least 2 players are ready

## Features

- Shareable room codes and invite URLs
- Max 8 players per room
- Classic US board names and rent tiers
- Dice, buy/decline, houses/hotels, mortgage/unmortgage
- Jail (pay / card / doubles), chance & community chest
- Server-owned turns and synchronized state
- Health: `http://localhost:3001/health`
- Open lobbies: `http://localhost:3001/rooms`

## Still missing vs the reference single-player game

- Player-to-player property trades
- Auctions when a property is declined
- Full AI opponents
- New York City edition board

## Free deployment: Render + Cloudflare Pages

### Backend on Render

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** and select this repository.
3. Render reads `render.yaml` and creates the free Node web service.
4. After it deploys, copy its public hostname, for example
   `monopoly-realtime-server.onrender.com`.
5. Verify `https://YOUR_RENDER_HOST/health` returns JSON with `"ok": true`.

The free Render service can sleep or restart. Rooms and games are currently kept
in memory, so an active game does not survive a server restart or redeployment.

### Frontend on Cloudflare Pages

Create a Pages project from the same GitHub repository with these settings:

- Framework preset: **Vite**
- Root directory: `/`
- Build command: `npm ci && npm run build -w client`
- Build output directory: `client/dist`
- Environment variable:
  `VITE_WS_URL=wss://YOUR_RENDER_HOST/ws`

Deploy after setting the environment variable. Vite embeds it at build time, so
changing the Render hostname requires a new frontend deployment.
