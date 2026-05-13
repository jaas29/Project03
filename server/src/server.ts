import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { scheduleDailyPuzzleJob, runDailyPuzzleJob } from './jobs/dailyPuzzleJob';
import { registerDuelSocket } from './sockets/duelSocket';

async function main() {
  await connectDb();

  // Seed today's puzzles if missing, then schedule nightly generation
  await runDailyPuzzleJob().catch((err) => console.error('[startup] puzzle seed failed:', err));
  scheduleDailyPuzzleJob();

  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.on('connection', (socket) => {
    console.log('[socket] client connected', socket.id);
    registerDuelSocket(io, socket);
    socket.on('disconnect', () => {
      console.log('[socket] client disconnected', socket.id);
    });
  });

  server.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
