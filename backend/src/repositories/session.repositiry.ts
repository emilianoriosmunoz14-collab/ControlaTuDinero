import { type ResultSetHeader } from 'mysql2';
import { pool } from '../db/pool.js';

// expires_at se calcula con el reloj de MySQL, el mismo que usa requireAuth (NOW()).
export async function createSession(userId: number, tokenHash: string, hours: number): Promise<void> {
  await pool.execute(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))',
    [userId, tokenHash, hours]
  );
}

export async function revokeSession(tokenHash: string): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE sessions SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
    [tokenHash]
  );
  return result.affectedRows > 0;
}
