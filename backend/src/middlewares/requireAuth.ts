import { type NextFunction, type Request, type Response } from 'express';
import { type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';
import { SESSION_COOKIE } from '../config/session.js';
import { hashToken, verifySessionToken } from '../services/token.service.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token.length === 0) {
    res.status(401).json({ message: 'Debes iniciar sesión' });
    return;
  }

  const userId = verifySessionToken(token);
  if (userId === null) {
    res.status(401).json({ message: 'Sesión no válida o expirada' });
    return;
  }

  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT id FROM sessions
    WHERE token_hash = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
    LIMIT 1
  `, [hashToken(token), userId]);
  if (rows.length === 0) {
    res.status(401).json({ message: 'Sesión no válida o expirada' });
    return;
  }

  req.authUserId = userId;
  next();
}