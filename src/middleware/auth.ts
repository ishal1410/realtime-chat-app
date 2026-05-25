import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Validates the Bearer token when present.
 * - No token  → unauthenticated, but allowed (public resolvers handle their own auth check)
 * - Bad/expired token → 401 immediately (prevents callers from smuggling invalid tokens)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // No credential provided — let resolvers decide if auth is required
    return next();
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is not set' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
