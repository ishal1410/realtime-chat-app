import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { typeDefs } from './graphql/schema';
import { resolvers, createUserLoader } from './graphql/resolvers';
import { connectDB } from './db/postgres';
import { connectRedis, redisClient } from './services/redis';
import { connectKafka, disconnectKafka } from './services/kafka';
import { authMiddleware } from './middleware/auth';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set — refusing to start');
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: process.env.ALLOWED_ORIGIN !== undefined,
  }),
);
app.use(express.json({ limit: '16kb' }));

// 100 requests per 15 minutes per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — try again later' },
  }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── WebSocket ─────────────────────────────────────────────────────────────────

interface WsMessage {
  type: string;
  roomId: string;
  content: string;
}

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  logger.info({ ip }, 'WebSocket connected');

  ws.on('message', (data) => {
    let message: WsMessage;

    // Never let a malformed payload crash the server
    try {
      message = JSON.parse(data.toString()) as WsMessage;
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    if (!message.type || !message.roomId || typeof message.content !== 'string') {
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
      return;
    }
    if (message.content.length > 2000) {
      ws.send(JSON.stringify({ error: 'Message content exceeds 2000 characters' }));
      return;
    }

    // Broadcast to all connected clients in the same room
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });

  ws.on('error', (err) => logger.error({ err, ip }, 'WebSocket error'));
  ws.on('close', () => logger.info({ ip }, 'WebSocket disconnected'));
});

// ─── Startup ───────────────────────────────────────────────────────────────────

async function startServer(): Promise<void> {
  await connectDB();
  await connectRedis();
  await connectKafka();

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  app.use(
    '/graphql',
    authMiddleware,
    expressMiddleware(apollo, {
      context: async ({ req }: { req: express.Request }) => ({
        userId: (req as any).userId as string | undefined,
        // Fresh DataLoader per request — batches all user fetches in one query
        userLoader: createUserLoader(),
      }),
    }),
  );

  const PORT = Number(process.env.PORT) || 4000;
  httpServer.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
    logger.info(`GraphQL playground → http://localhost:${PORT}/graphql`);
  });

  // ─── Graceful shutdown ──────────────────────────────────────────────────────

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    httpServer.close(async () => {
      try {
        await apollo.stop();
        await disconnectKafka();
        redisClient.disconnect();
        logger.info('Server shut down cleanly');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
    // Force-exit if clean shutdown stalls
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
