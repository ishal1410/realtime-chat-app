import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateRoomName,
  validateMessageContent,
  requireId,
} from '../graphql/validation';

describe('validateUsername', () => {
  it('accepts valid usernames', () => {
    expect(() => validateUsername('alice')).not.toThrow();
    expect(() => validateUsername('Bob_42')).not.toThrow();
    expect(() => validateUsername('a'.repeat(50))).not.toThrow();
  });

  it('rejects usernames that are too short', () => {
    expect(() => validateUsername('ab')).toThrow('3–50');
  });

  it('rejects usernames that are too long', () => {
    expect(() => validateUsername('a'.repeat(51))).toThrow('3–50');
  });

  it('rejects usernames with special characters', () => {
    expect(() => validateUsername('alice!')).toThrow('letters, numbers');
    expect(() => validateUsername('alice smith')).toThrow('letters, numbers');
  });
});

describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(() => validateEmail('user@example.com')).not.toThrow();
    expect(() => validateEmail('a+b@x.io')).not.toThrow();
  });

  it('rejects malformed email addresses', () => {
    expect(() => validateEmail('not-an-email')).toThrow('Invalid email');
    expect(() => validateEmail('@example.com')).toThrow('Invalid email');
    expect(() => validateEmail('user@')).toThrow('Invalid email');
    expect(() => validateEmail('')).toThrow('Invalid email');
  });
});

describe('validatePassword', () => {
  it('accepts passwords of 8+ characters', () => {
    expect(() => validatePassword('secret12')).not.toThrow();
    expect(() => validatePassword('a'.repeat(100))).not.toThrow();
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(() => validatePassword('short')).toThrow('8 characters');
    expect(() => validatePassword('')).toThrow('8 characters');
  });
});

describe('validateRoomName', () => {
  it('returns the trimmed name for valid input', () => {
    expect(validateRoomName('  General  ')).toBe('General');
    expect(validateRoomName('a'.repeat(100))).toHaveLength(100);
  });

  it('rejects empty / whitespace-only names', () => {
    expect(() => validateRoomName('')).toThrow('1–100');
    expect(() => validateRoomName('   ')).toThrow('1–100');
  });

  it('rejects names longer than 100 characters', () => {
    expect(() => validateRoomName('a'.repeat(101))).toThrow('1–100');
  });
});

describe('validateMessageContent', () => {
  it('returns trimmed content for valid messages', () => {
    expect(validateMessageContent('  hello  ')).toBe('hello');
  });

  it('rejects empty content', () => {
    expect(() => validateMessageContent('')).toThrow('1–2000');
    expect(() => validateMessageContent('   ')).toThrow('1–2000');
  });

  it('rejects content exceeding 2000 characters', () => {
    expect(() => validateMessageContent('a'.repeat(2001))).toThrow('1–2000');
  });
});

describe('requireId', () => {
  it('does not throw when a value is present', () => {
    expect(() => requireId('123', 'Room ID')).not.toThrow();
  });

  it('throws with the label when value is falsy', () => {
    expect(() => requireId(null, 'Room ID')).toThrow('Room ID is required');
    expect(() => requireId('', 'User ID')).toThrow('User ID is required');
    expect(() => requireId(undefined, 'Message ID')).toThrow('Message ID is required');
  });
});
