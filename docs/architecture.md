# Architecture

> Owner: Darius. To be expanded with diagrams during week 1.

## High-level

```
┌─────────┐    HTTPS     ┌──────────────┐    ┌──────────────┐
│ Browser ├─────────────►│   Express    ├───►│ MongoDB Atlas│
│ (React) │   WebSocket  │   API        │    └──────────────┘
└────┬────┘◄─────────────┤  + Socket.IO │           ▲
     │                   └──────┬───────┘           │
     │                          │                   │
     │                          ▼                   │
     │                   ┌──────────────┐           │
     │                   │  Cron worker │───────────┘
     │                   │  (Render)    │  daily puzzles
     │                   └──────┬───────┘
     │                          │
     │                          ▼
     │                   ┌──────────────┐
     └──────────────────►│football-data │
                         │    .org      │
                         └──────────────┘
```

## Data flow — daily puzzle

1. Render cron worker fires at 00:05 UTC.
2. Worker calls football-data.org for fresh league/team data.
3. Generator builds 3 puzzles (Grid, Connections, Wordle) for today's date.
4. Puzzles upserted into Mongo `puzzles` collection.
5. Client requests `GET /api/puzzles/today` → server returns today's set.

## Real-time — duels

1. Player A invites Player B (or matchmakes anonymously).
2. Both clients join Socket.IO room `duel:<matchId>`.
3. Server emits `puzzle:start` with puzzle payload.
4. Each submission emits `progress:update` to opponent.
5. Server scores both players, persists DuelMatch, emits `match:end`.
6. ELO updated atomically on User docs.

## Tradeoffs

| Decision | Chose | Why |
|---|---|---|
| Auth strategy | JWT (access + refresh) over sessions | JWTs are stateless — easier on Render/Vercel where you can't share session state |
| Duel mode | Hot-seat first, Socket.IO as stretch | Reduces risk — delivers the feature even if real-time isn't ready in time |
| Hosting split | Vercel (FE) + Render (API + cron) | Both free tiers; Render supports cron workers natively |
| Monorepo | npm workspaces | Simple, no Turborepo/Nx overhead for a 10-day project |
| Shared types | Duplicated in client + server | Avoids a shared build step; only ~6 small interfaces |
