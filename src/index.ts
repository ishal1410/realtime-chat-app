import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { connectDB } from './db/postgres';
import { connectRedis } from './services/redis';
import { connectKafka } from './services/kafka';
import { authMiddleware } from './middleware/auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(express.json());

// WebSocket for real-time messaging
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    wss.clients.forEach(client => {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });
  ws.on('close', () => console.log('Client disconnected'));
});

async function startServer() {
  await connectDB();
  await connectRedis();
  await connectKafka();

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  app.use('/graphql', authMiddleware, expressMiddleware(apollo, {
    context: async ({ req }: { req: express.Request }) => ({ userId: (req as any).userId }),
  }));

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL: http://localhost:${PORT}/graphql`);
  });
}

startServer().catch(console.error);