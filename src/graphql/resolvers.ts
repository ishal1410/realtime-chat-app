import { pool } from '../db/postgres';
import { redisClient } from '../services/redis';
import { publishMessage } from '../services/kafka';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const resolvers = {
  Query: {
    me: async (_: any, __: any, { userId }: any) => {
      if (!userId) throw new Error('Not authenticated');
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return result.rows[0];
    },
    rooms: async () => {
      const cached = await redisClient.get('rooms');
      if (cached) return JSON.parse(cached);
      const result = await pool.query('SELECT * FROM rooms');
      await redisClient.setex('rooms', 60, JSON.stringify(result.rows));
      return result.rows;
    },
    room: async (_: any, { id }: any) => {
      const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
      return result.rows[0];
    },
    messages: async (_: any, { roomId }: any) => {
      const cached = await redisClient.get(`messages:${roomId}`);
      if (cached) return JSON.parse(cached);
      const result = await pool.query(
        'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
        [roomId]
      );
      await redisClient.setex(`messages:${roomId}`, 30, JSON.stringify(result.rows));
      return result.rows;
    },
  },
  Mutation: {
    register: async (_: any, { username, email, password }: any) => {
      const hashed = await bcrypt.hash(password, 12);
      const result = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, hashed]
      );
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      return { token, user };
    },
    login: async (_: any, { email, password }: any) => {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Invalid credentials');
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      return { token, user };
    },
    createRoom: async (_: any, { name }: any, { userId }: any) => {
      if (!userId) throw new Error('Not authenticated');
      const result = await pool.query(
        'INSERT INTO rooms (name, created_by) VALUES ($1, $2) RETURNING *',
        [name, userId]
      );
      await redisClient.del('rooms');
      return result.rows[0];
    },
    sendMessage: async (_: any, { roomId, content }: any, { userId }: any) => {
      if (!userId) throw new Error('Not authenticated');
      const result = await pool.query(
        'INSERT INTO messages (content, sender_id, room_id) VALUES ($1, $2, $3) RETURNING *',
        [content, userId, roomId]
      );
      const message = result.rows[0];
      await publishMessage({ roomId, message });
      await redisClient.del(`messages:${roomId}`);
      return message;
    },
    joinRoom: async (_: any, { roomId }: any, { userId }: any) => {
      if (!userId) throw new Error('Not authenticated');
      await pool.query(
        'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roomId, userId]
      );
      const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
      return result.rows[0];
    },
  },
  Message: {
    sender: async (message: any) => {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [message.sender_id]);
      return result.rows[0];
    },
  },
};