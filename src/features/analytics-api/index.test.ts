import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLoginHandler, requireAuth } from './auth.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_PASSWORD = 'supersecret';
const TEST_SECRET = 'test-jwt-secret-32chars-minimum!!';

interface MockRes {
  status: (code: number) => MockRes;
  json: (body: unknown) => MockRes;
  locals: Record<string, unknown>;
}

function makeMockRes(): { res: MockRes; getStatus: () => number; getBody: () => unknown } {
  let statusCode = 200;
  let responseBody: unknown = null;
  const res: MockRes = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: unknown) => {
      responseBody = body;
      return res;
    },
    locals: {},
  };
  return { res, getStatus: () => statusCode, getBody: () => responseBody };
}

afterEach(() => {
  vi.clearAllMocks();
});

// ── createLoginHandler ────────────────────────────────────────────────────────

describe('createLoginHandler', () => {
  it('should return 400 when password is missing', () => {
    const handler = createLoginHandler(TEST_PASSWORD, TEST_SECRET);
    const mockReq = { body: {} } as Parameters<typeof handler>[0];
    const { res, getStatus, getBody } = makeMockRes();

    handler(mockReq, res as unknown as Parameters<typeof handler>[1]);

    expect(getStatus()).toBe(400);
    expect(getBody()).toMatchObject({ error: 'password is required' });
  });

  it('should return 401 for wrong password', () => {
    const handler = createLoginHandler(TEST_PASSWORD, TEST_SECRET);
    const mockReq = { body: { password: 'wrongpassword' } } as Parameters<typeof handler>[0];
    const { res, getStatus, getBody } = makeMockRes();

    handler(mockReq, res as unknown as Parameters<typeof handler>[1]);

    expect(getStatus()).toBe(401);
    expect(getBody()).toMatchObject({ error: 'Invalid password' });
  });

  it('should return a JWT token for correct password', () => {
    const handler = createLoginHandler(TEST_PASSWORD, TEST_SECRET);
    const mockReq = { body: { password: TEST_PASSWORD } } as Parameters<typeof handler>[0];
    const { res, getBody } = makeMockRes();

    handler(mockReq, res as unknown as Parameters<typeof handler>[1]);

    expect(getBody()).toMatchObject({ token: expect.any(String) });
    const { token } = getBody() as { token: string };
    expect(token.split('.')).toHaveLength(3); // valid JWT format
  });
});

// ── requireAuth ───────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('should return 401 when no Authorization header', () => {
    const middleware = requireAuth(TEST_SECRET);
    const mockReq = { headers: {} } as Parameters<typeof middleware>[0];
    const { res, getStatus, getBody } = makeMockRes();
    const mockNext = vi.fn();

    middleware(mockReq, res as unknown as Parameters<typeof middleware>[1], mockNext);

    expect(getStatus()).toBe(401);
    expect(getBody()).toMatchObject({ error: expect.stringContaining('Authorization') });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid JWT', () => {
    const middleware = requireAuth(TEST_SECRET);
    const mockReq = {
      headers: { authorization: 'Bearer invalid.token.here' },
    } as Parameters<typeof middleware>[0];
    const { res, getStatus } = makeMockRes();
    const mockNext = vi.fn();

    middleware(mockReq, res as unknown as Parameters<typeof middleware>[1], mockNext);

    expect(getStatus()).toBe(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() for valid JWT', () => {
    // Generate a valid token first
    const loginHandler = createLoginHandler(TEST_PASSWORD, TEST_SECRET);
    let token = '';
    const { res: loginRes } = makeMockRes();
    const loginResWithCapture = {
      ...loginRes,
      json: (body: unknown) => {
        token = (body as { token: string }).token;
        return loginResWithCapture;
      },
    };
    loginHandler(
      { body: { password: TEST_PASSWORD } } as Parameters<typeof loginHandler>[0],
      loginResWithCapture as unknown as Parameters<typeof loginHandler>[1]
    );

    // Now test the middleware
    const middleware = requireAuth(TEST_SECRET);
    const mockReq = {
      headers: { authorization: `Bearer ${token}` },
    } as Parameters<typeof middleware>[0];
    const { res } = makeMockRes();
    const mockNext = vi.fn();

    middleware(mockReq, res as unknown as Parameters<typeof middleware>[1], mockNext);

    expect(mockNext).toHaveBeenCalledOnce();
  });
});
