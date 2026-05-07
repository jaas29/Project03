# API reference

> All authed endpoints require `Authorization: Bearer <accessToken>`.

## Auth
- `POST /api/auth/register` → `{ email, username, password }` → `{ user, accessToken, refreshToken }`
- `POST /api/auth/login` → `{ email, password }` → `{ user, accessToken, refreshToken }`
- `POST /api/auth/refresh` → `{ refreshToken }` → `{ accessToken }`
- `POST /api/auth/logout` → `{}`

## Puzzles
- `GET /api/puzzles/today` → `{ grid, connections, wordle, higherlower? }`
- `POST /api/puzzles/:id/submit` (auth) → `{ guesses }` → `{ score, attempts }`

## Duels
- `POST /api/duels/hotseat` (auth) → `{ puzzleId }` → `{ matchId }`
- `POST /api/duels/online/queue` (auth) → joins matchmaking queue
- `POST /api/duels/online/invite` (auth) → `{ targetUserId | inviteToken }`
- Socket events: `duel:join`, `puzzle:start`, `progress:update`, `match:end`

## Leaderboard
- `GET /api/leaderboard/daily?date=YYYY-MM-DD`
- `GET /api/leaderboard/all-time`
- `GET /api/leaderboard/ranked` (ELO)

## Friends
- `GET /api/friends`
- `POST /api/friends/request` → `{ username }`
- `POST /api/friends/accept` → `{ friendshipId }`

## Admin (role: admin)
- `GET /api/admin/reports`
- `POST /api/admin/users/:id/ban`
- `PUT /api/admin/puzzles/:id` (override daily set)

## System
- `GET /health` → `{ status, uptime }`
