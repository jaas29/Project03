process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-which-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-which-is-long-enough';

import request from 'supertest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/services/tokens';

describe('admin panel access control', () => {
  const app = createApp();

  it('rejects unauthenticated request to admin users endpoint', async () => {
    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing bearer token' });
  });

  it('rejects non-admin token on admin users endpoint', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'user' });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Admin only' });
  });
});
