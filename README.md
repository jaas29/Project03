# Jogo Bonito Daily

> CEN 3020 (Spring 2026) — Project 03. A daily soccer puzzle web app with real-time 1v1 duels.

**Team:** Darius Beckford (PM) · Hugo Cruz · Sebas Rodriguez · Bruno Valdez · José Araya

**Status:** scaffolding (Day 1).

---

## Problem

Soccer fans want a quick daily brain-teaser they can play with friends. Existing options (e.g. futbol-11.com) are single-player with no accounts. Jogo Bonito Daily adds accounts, streaks, leaderboards, and real-time 1v1 duels.

## MVP Features

1. Daily Puzzle Suite (Football Grid, Connections, Wordle)
2. Auth & Profiles (JWT)
3. Hot-seat 1v1 Duels (online via Socket.IO as stretch)
4. Live Football Data Integration (football-data.org)
5. Role-based Admin Panel

## Stack

- **Client:** React 18 + Vite + TypeScript + Tailwind CSS
- **Server:** Node 20 + Express + Mongoose
- **DB:** MongoDB Atlas
- **Real-time:** Socket.IO
- **Auth:** JWT (access + refresh) + bcrypt
- **Hosting:** Vercel (FE) + Render (API + cron worker)
- **Tests:** Jest + Supertest (server), Vitest (client)
- **CI:** GitHub Actions

## Repo layout

```
client/    React + Vite frontend
server/    Express API + Socket.IO + cron jobs
docs/      Architecture, schema, API, tradeoffs
```

Types live in `client/src/types/` and `server/src/types/` (kept in sync manually — only ~6 small interfaces).

## Getting started

```bash
# install all workspaces
npm install

# copy env template
cp .env.example .env
# (fill in MongoDB URI + JWT secrets + football-data API key)

# run client (port 5173) and server (port 4000) in two terminals
npm run dev:client
npm run dev:server
```

## Branch workflow

- `main` is protected — PR + 1 reviewer required. Always deployable.
- Branch off `main` for features: `feat/<area>-<short-desc>` (e.g. `feat/auth-jwt-login`).
- Open PR back into `main`, get 1 review, squash-merge.
- Pull latest `main` before starting a new branch.

## Task ownership

| Member | Area |
|---|---|
| Darius | PM, project board, demo, report (architecture/decisions) |
| José | Repo bootstrap, auth, frontend game shells, mobile layout |
| Hugo | Profile, leaderboard, share-cards, homepage, admin UI |
| Sebas | Puzzle generator, football-data API, daily cron, admin endpoints |
| Bruno | Hot-seat duels, Socket.IO online duels, ELO, friends |

See [`docs/architecture.md`](docs/architecture.md) and the full execution plan in `docs/plan.md`.
