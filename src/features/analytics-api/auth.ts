/**
 * Auth helpers for the analytics API.
 *
 * - createLoginHandler: returns an Express handler that verifies a plain-text
 *   password using timing-safe comparison and issues a JWT on success.
 * - requireAuth: Express middleware that validates the JWT from the Authorization
 *   header and attaches the decoded payload to res.locals.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRY = '7d';

// ── Login handler factory ─────────────────────────────────────────────────────

/**
 * Returns an Express route handler for POST /api/auth/login.
 * Compares the provided password against the stored plain-text password using
 * a constant-time comparison to prevent timing attacks.
 */
export function createLoginHandler(
  dashboardPassword: string,
  jwtSecret: string
): (req: Request, res: Response) => void {
  return (req: Request, res: Response): void => {
    const { password } = req.body as { password?: string };

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'password is required' });
      return;
    }

    const provided = createHash('sha256').update(password).digest();
    const expected = createHash('sha256').update(dashboardPassword).digest();

    let valid = false;
    try {
      valid = timingSafeEqual(provided, expected);
    } catch {
      valid = false;
    }

    if (!valid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    const token = jwt.sign({ sub: 'dashboard' }, jwtSecret, {
      algorithm: JWT_ALGORITHM,
      expiresIn: JWT_EXPIRY,
    });

    res.json({ token });
  };
}

// ── Auth middleware ───────────────────────────────────────────────────────────

/**
 * Express middleware that requires a valid JWT in the Authorization header.
 * Bearer token format: "Authorization: Bearer <token>"
 */
export function requireAuth(
  jwtSecret: string
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, jwtSecret, { algorithms: [JWT_ALGORITHM] });
      res.locals['auth'] = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
