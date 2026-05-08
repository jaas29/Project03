process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

import { validate } from '../src/middleware/validate';
import { registerSchema as schema } from '../src/routes/auth.schemas';
import { ZodError } from 'zod';

function runMiddleware(body: unknown) {
  const req = { body } as any;
  const res = {} as any;
  return new Promise<{ err?: unknown; body: unknown }>((resolve) => {
    validate(schema)(req, res, (err?: unknown) => resolve({ err, body: req.body }));
  });
}

describe('validate middleware', () => {
  it('passes valid register input', async () => {
    const { err, body } = await runMiddleware({
      email: 'jose@example.com',
      username: 'jose_a',
      password: 'supersecret',
    });
    expect(err).toBeUndefined();
    expect((body as any).email).toBe('jose@example.com');
  });

  it('rejects short password with ZodError', async () => {
    const { err } = await runMiddleware({
      email: 'jose@example.com',
      username: 'jose_a',
      password: 'short',
    });
    expect(err).toBeInstanceOf(ZodError);
  });

  it('rejects bad email', async () => {
    const { err } = await runMiddleware({
      email: 'not-an-email',
      username: 'jose_a',
      password: 'supersecret',
    });
    expect(err).toBeInstanceOf(ZodError);
  });
});
