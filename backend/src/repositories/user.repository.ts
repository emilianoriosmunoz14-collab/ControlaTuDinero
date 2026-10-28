import { type ResultSetHeader, type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

interface BasicUser { id: number; name: string; email: string }
const initialCategories: Array<[string, 'income' | 'expense']> = [
  ['Sueldo', 'income'], ['Otros ingresos', 'income'],
  ['Comida', 'expense'], ['Transporte', 'expense'],
  ['Entretenimiento', 'expense'], ['Compras', 'expense'],
];

export async function createUserWithCategories(
  data: { name: string; email: string; passwordHash: string }
): Promise<BasicUser> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [data.name, data.email, data.passwordHash]
    );
    for (const [name, type] of initialCategories) {
      await conn.execute(
        'INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)',
        [result.insertId, name, type]
      );
    }
    await conn.commit();
    return { id: result.insertId, name: data.name, email: data.email };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// Este método queda listo para que Emiliano programe login.
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
