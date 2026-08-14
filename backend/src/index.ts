import http from 'node:http';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { env } from './env.js';
import { flushPendingPersists } from './ws/persistence.js';
import { attachSocketServer } from './ws/socketServer.js';
import { attachYjsServer } from './ws/yjsServer.js';

async function main(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  // Real-time layers share the same HTTP server.
  const io = attachSocketServer(server);
  attachYjsServer(server);

  server.listen(env.PORT, () => {
    console.log(`[syncspace] backend running at http://localhost:${env.PORT}`);
    console.log(`[syncspace] REST API    -> /api`);
    console.log(`[syncspace] Socket.IO   -> /socket.io`);
    console.log(`[syncspace] Yjs (CRDT)  -> /yjs/<room>`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[syncspace] ${signal} received, shutting down gracefully...`);
    try {
      await flushPendingPersists();
    } catch (error) {
      console.error('[syncspace] error while flushing Yjs state:', error);
    }
    io.close();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[syncspace] failed to start:', error);
  process.exit(1);
});
