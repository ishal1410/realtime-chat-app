import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';

const TEST_SECRET = 'test_secret_that_is_long_enough_to_be_secure';

// Swap in a known JWT secret before all tests
beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

/** Build a minimal Express Request mock with a given Authorization header */
function makeReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

/** Build a spy-enabled Response mock */
function makeRes(): Response {
  const res = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('authMiddleware', () => {
  describe('when no Authorization header is provided', () => {
    it('calls next() without setting userId', () => {
      const req = makeReq();
      const res = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect((req as any).userId).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('when a valid Bearer token is provided', () => {
    it('sets req.userId and calls next()', () => {
      const token = jwt.sign({ userId: '42' }, TEST_SECRET, { expiresIn: '1h' });
      const req = makeReq(`Bearer ${token}`);
      const res = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      authMiddleware(req, res, next);

      expect((req as any).userId).toBe('42');
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('when an invalid token is provided', () => {
    it('returns 401 and does NOT call next()', () => {
      const req = makeReq('Bearer totally.invalid.token');
      const res = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for an expired token', () => {
      const token = jwt.sign({ userId: '42' }, TEST_SECRET, { expiresIn: '0s' });
      const req = makeReq(`Bearer ${token}`);
      const res = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for a token signed with the wrong secret', () => {
      const token = jwt.sign({ userId: '42' }, 'wrong_secret');
      const req = makeReq(`Bearer ${token}`);
      const res = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('when the Authorization scheme is not Bearer', () => {
    it('calls next() and does not attempt to verify', () => {
      const req = makeReq('Basic dXNlcjpwYXNz');
      const res = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
