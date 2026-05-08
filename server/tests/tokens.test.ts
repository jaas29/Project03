process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-which-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-which-is-long-enough';

import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../src/services/tokens';

describe('tokens', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'user-123', role: 'user' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.role).toBe('user');
  });

  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken({ sub: 'user-456' });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-456');
  });

  it('rejects a tampered access token', () => {
    const token = signAccessToken({ sub: 'user-789', role: 'admin' });
    const tampered = token.slice(0, -2) + 'aa';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
