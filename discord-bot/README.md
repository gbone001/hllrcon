# HLLRCON Discord Bot

MVP Discord bot scaffold for persistent Hell Let Loose admin panels powered by the existing `hllrcon` REST API.

## Included

- `/hll-panels setup`
- `/hll-panels rebuild`
- `/hll-panels refresh-all`
- Persistent overview panel
- Persistent player operations panel
- Persistent map control panel
- Audit log channel output for write actions
- File-backed panel/message state
- Cookie-based session handling against `hllrcon`

## Quick Start

1. Copy `.env.example` to `.env`
2. Fill in Discord and HLL server values
3. Install dependencies
4. Run the bot

```bash
npm install
npm run build
npm start
```

## Railway

Deploy the Discord bot as its own Railway service with the service root set to [discord-bot](/C:/Users/gbone/OneDrive/Documents/Projects/TopSTATS-VIP/hllrcon/discord-bot).

1. Create a new Railway service from this folder
2. Set the required environment variables from [.env.example](/C:/Users/gbone/OneDrive/Documents/Projects/TopSTATS-VIP/hllrcon/discord-bot/.env.example)
3. Point `HLLRCON_BASE_URL` at your deployed `hllrcon` API
4. Set `HLL_STATE_FILE=/data/state.json`
5. Attach a Railway volume mounted at `/data`

This service is packaged with its own [Dockerfile](/C:/Users/gbone/OneDrive/Documents/Projects/TopSTATS-VIP/hllrcon/discord-bot/Dockerfile) and [railway.toml](/C:/Users/gbone/OneDrive/Documents/Projects/TopSTATS-VIP/hllrcon/discord-bot/railway.toml). It also handles `SIGINT` and `SIGTERM` so Railway restarts shut the Discord session down cleanly.

## Notes

- This scaffold assumes one Discord guild manages one HLL server target.
- The bot keeps a session cookie for `hllrcon` and reconnects when needed.
- The persistent state file defaults to `discord-bot/data/state.json`.
- Component handlers are implemented for the MVP panel workflows only.
- Optional Discord role env vars can enforce access tiers for observer, moderator, senior admin, and admin actions.
