import DataLoader from 'dataloader';
import { pool } from '../db/postgres';

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

/**
 * Creates a per-request DataLoader that batches user lookups.
 * Eliminates N+1 queries on Message.sender — a single DB round-trip
 * fetches all requested users for the current response.
 */
export function createUserLoader(): DataLoader<string, User | null> {
  return new DataLoader<string, User | null>(async (ids) => {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = ANY($1::int[])',
      [ids],
    );
    const byId = new Map(result.rows.map((u) => [String(u.id), u]));
    return ids.map((id) => byId.get(id) ?? null);
  });
}
