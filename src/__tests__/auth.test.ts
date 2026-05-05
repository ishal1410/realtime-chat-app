import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'test_secret';

describe('Authentication', () => {
  describe('JWT Token', () => {
    it('should generate a valid JWT token', () => {
      const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '7d' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify a valid JWT token', () => {
      const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '7d' });
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      expect(decoded.userId).toBe('123');
    });

    it('should reject an invalid JWT token', () => {
      expect(() => {
        jwt.verify('invalid_token', JWT_SECRET);
      }).toThrow();
    });

    it('should reject an expired JWT token', () => {
      const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '0s' });
      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hashed = await bcrypt.hash(password, 12);
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
    });

    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hashed = await bcrypt.hash(password, 12);
      const match = await bcrypt.compare(password, hashed);
      expect(match).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const hashed = await bcrypt.hash(password, 12);
      const match = await bcrypt.compare('wrongpassword', hashed);
      expect(match).toBe(false);
    });
  });
});