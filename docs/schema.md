# Database schema (MongoDB)

## users
```ts
{
  _id: ObjectId,
  email: string,           // unique, lowercased
  passwordHash: string,    // bcrypt
  username: string,        // unique
  role: 'user' | 'admin',
  elo: number,             // default 1000
  streak: { current: number, best: number, lastPlayedDate: string },
  stats: { played: number, wins: number, losses: number },
  createdAt: Date,
  updatedAt: Date,
}
```

## puzzles
```ts
{
  _id: ObjectId,
  date: string,            // YYYY-MM-DD (indexed)
  type: 'grid' | 'connections' | 'wordle' | 'higherlower',
  payload: object,         // shape depends on type
  solution: object,        // hidden, server-only
  generatedAt: Date,
}
```
Compound unique index on `(date, type)`.

## playResults
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  puzzleId: ObjectId,
  score: number,
  attempts: number,
  durationMs: number,
  completedAt: Date,
}
```

## duelMatches
```ts
{
  _id: ObjectId,
  players: [ObjectId, ObjectId],
  puzzleId: ObjectId,
  mode: 'hotseat' | 'online',
  scores: [number, number],
  winner: ObjectId | null,
  status: 'pending' | 'active' | 'finished',
  eloDelta: number,
  createdAt: Date,
  finishedAt: Date | null,
}
```

## friendships
```ts
{
  _id: ObjectId,
  requester: ObjectId,
  recipient: ObjectId,
  status: 'pending' | 'accepted',
  createdAt: Date,
}
```

## reports
```ts
{
  _id: ObjectId,
  reporter: ObjectId,
  target: ObjectId,
  reason: string,
  status: 'open' | 'resolved',
  createdAt: Date,
}
```
