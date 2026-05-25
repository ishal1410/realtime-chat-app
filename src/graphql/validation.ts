export function validateUsername(username: unknown): void {
  if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
    throw new Error('Username must be 3–50 characters');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username may only contain letters, numbers, and underscores');
  }
}

export function validateEmail(email: unknown): void {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address');
  }
}

export function validatePassword(password: unknown): void {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
}

export function validateRoomName(name: unknown): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed || trimmed.length > 100) {
    throw new Error('Room name must be 1–100 characters');
  }
  return trimmed;
}

export function validateMessageContent(content: unknown): string {
  const trimmed = typeof content === 'string' ? content.trim() : '';
  if (!trimmed || trimmed.length > 2000) {
    throw new Error('Message content must be 1–2000 characters');
  }
  return trimmed;
}

export function requireId(value: unknown, label: string): void {
  if (!value) throw new Error(`${label} is required`);
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}
