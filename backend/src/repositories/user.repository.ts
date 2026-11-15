import { type ResultSetHeader, type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

interface BasicUser { id: number; name: string; email: string }

// Nombre antiguo mantenido para no modificar auth.controller.ts (lo cambiara Emiliano).
// Las categorias ahora son GENERALES y se crean con el esquema/migracion SQL.
export async function createUserWithCategories(
  data: { name: string; email: string; passwordHash: string }
): Promise<BasicUser> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [data.name, data.email, data.passwordHash]
  );
  return { id: result.insertId, name: data.name, email: data.email };
}

export async function findUserByEmail(email: string): Promise<
  {id: number; email: string; name: string; passwordHash: string} | null
> {
  const [rows] = await pool.execute<(RowDataPacket & {
    id: number; email: string; name: string; passwordHash: string
  })[]>(
    'SELECT id, email, name, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );
  return rows[0] ?? null;
}
