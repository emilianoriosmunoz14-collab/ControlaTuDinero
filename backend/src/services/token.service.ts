import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { SESSION_HOURS } from '../config/session.js';

const ISSUER = 'controlatudinero';
const ALGORITHM = 'HS256';

export function signSessionToken(userId: number): string {
  return jwt.sign({}, env.jwtSecret, {
    algorithm: ALGORITHM,
    issuer: ISSUER,
    subject: String(userId),
    jwtid: randomBytes(16).toString('hex'),
    expiresIn: `${SESSION_HOURS}h`,
  });
}

export function verifySessionToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');