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

- _to be filled in by Darius_
