import { createHash } from 'node:crypto';
import { type NextFunction, type Request, type Response } from 'express';
import { type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

interface SessionRow extends RowDataPacket { userId: number }

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawToken: unknown = req.cookies?.ctd_session;
  if (typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/.test(rawToken)) {
    res.status(401).json({ message: 'Debes iniciar sesión' });
    return;
  }
  const hash = createHash('sha256').update(rawToken).digest('hex');
  const [sessions] = await pool.execute<SessionRow[]>(`
    SELECT user_id AS userId FROM sessions
    WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
    LIMIT 1
  `, [hash]);
  if (sessions.length === 0) {
    res.status(401).json({ message: 'Sesión no válida o expirada' });
    return;
  }
  req.authUserId = sessions[0].userId;
  next();
}
