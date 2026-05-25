import { pool } from '../db/postgres';
import { redisClient } from '../services/redis';
import { publishMessage } from '../services/kafka';
import { broadcast } from '../services/broadcaster';
import { createUserLoader } from './loaders';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateRoomName,
  validateMessageContent,
  requireId,
  getJwtSecret,
} from './validation';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export { createUserLoader };

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { userId }: { userId?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return result.rows[0] ?? null;
    },

    rooms: async () => {
      const cached = await redisClient.get('rooms');
      if (cached) return JSON.parse(cached) as unknown[];
      const result = await pool.query('SELECT * FROM rooms ORDER BY created_at DESC');
      await redisClient.setex('rooms', 60, JSON.stringify(result.rows));
      return result.rows;
    },

    room: async (_: unknown, { id }: { id: string }) => {
      requireId(id, 'Room ID');
      const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
      return result.rows[0] ?? null;
    },

    messages: async (_: unknown, { roomId }: { roomId: string }) => {
      requireId(roomId, 'Room ID');
      const cached = await redisClient.get(`messages:${roomId}`);
      if (cached) return JSON.parse(cached) as unknown[];
      const result = await pool.query(
        'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
        [roomId],
      );
      await redisClient.setex(`messages:${roomId}`, 30, JSON.stringify(result.rows));
      return result.rows;
    },
  },

  Mutation: {
    register: async (
      _: unknown,
      { username, email, password }: { username: string; email: string; password: string },
    ) => {
      validateUsername(username);
      validateEmail(email);
      validatePassword(password);

      const hashed = await bcrypt.hash(password, 12);
      const result = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, hashed],
      );
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '7d' });
      return { token, user };
    },

    login: async (_: unknown, { email, password }: { email: string; password: string }) => {
      validateEmail(email);
      if (!password) throw new Error('Password is required');

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      // Constant-time comparison even when user doesn't exist (prevents timing attacks)
      const dummy = '$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const valid = user
        ? await bcrypt.compare(password, user.password)
        : await bcrypt.compare(password, dummy).then(() => false);

      if (!valid) throw new Error('Invalid credentials');
      const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '7d' });
      return { token, user };
    },

    createRoom: async (
      _: unknown,
      { name }: { name: string },
      { userId }: { userId?: string },
    ) => {
      if (!userId) throw new Error('Not authenticated');
      const trimmedName = validateRoomName(name);
      const result = await pool.query(
        'INSERT INTO rooms (name, created_by) VALUES ($1, $2) RETURNING *',
        [trimmedName, userId],
      );
      await redisClient.del('rooms');
      return result.rows[0];
    },

    sendMessage: async (
      _: unknown,
      { roomId, content }: { roomId: string; content: string },
      { userId }: { userId?: string },
    ) => {
      if (!userId) throw new Error('Not authenticated');
      requireId(roomId, 'Room ID');
      const trimmedContent = validateMessageContent(content);

      const result = await pool.query(
        'INSERT INTO messages (content, sender_id, room_id) VALUES ($1, $2, $3) RETURNING *',
        [trimmedContent, userId, roomId],
      );
      const message = result.rows[0];

      // Fetch sender for the WS broadcast (so all clients get full message shape)
      const senderResult = await pool.query(
        'SELECT id, username FROM users WHERE id = $1',
        [userId],
      );
      const sender = senderResult.rows[0];

      // Broadcast to every connected WebSocket client — this is what makes it realtime
      broadcast({
        type: 'new_message',
        roomId: String(roomId),
        message: {
          id: String(message.id),
          content: message.content,
          createdAt: new Date(message.created_at).toISOString(),
          sender: { id: String(sender.id), username: sender.username },
        },
      });

      await publishMessage({ roomId, message });
      await redisClient.del(`messages:${roomId}`);
      return message;
    },

    joinRoom: async (
      _: unknown,
      { roomId }: { roomId: string },
      { userId }: { userId?: string },
    ) => {
      if (!userId) throw new Error('Not authenticated');
      requireId(roomId, 'Room ID');

      await pool.query(
        'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roomId, userId],
      );
      const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
      return result.rows[0];
    },
  },

  // ── Field resolvers: map Postgres snake_case columns to GraphQL camelCase ──

  User: {
    createdAt: (user: any) => new Date(user.created_at).toISOString(),
  },

  Message: {
    senderId:  (msg: any) => msg.sender_id,
    roomId:    (msg: any) => msg.room_id,
    createdAt: (msg: any) => new Date(msg.created_at).toISOString(),
    /**
     * Uses a per-request DataLoader to batch all sender lookups into one query
     * — eliminates the N+1 problem when listing many messages.
     */
    sender: async (message: { sender_id: number }, _: unknown, context: any) => {
      return (context.userLoader as ReturnType<typeof createUserLoader>).load(
        String(message.sender_id),
      );
    },
  },

  Room: {
    members: async (room: { id: number }) => {
      const result = await pool.query(
        `SELECT u.* FROM users u
         JOIN room_members rm ON rm.user_id = u.id
         WHERE rm.room_id = $1`,
        [room.id],
      );
      return result.rows;
    },
    messages: async (room: { id: number }) => {
      const result = await pool.query(
        'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
        [room.id],
      );
      return result.rows;
    },
  },
};
