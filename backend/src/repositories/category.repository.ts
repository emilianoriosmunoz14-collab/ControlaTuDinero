import { type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  type: 'income' | 'expense';
}

export async function listCategories(userId: number) {
  const [rows] = await pool.execute<CategoryRow[]>(
    'SELECT id, name, type FROM categories WHERE user_id = ? ORDER BY type, name',
    [userId]
  );
  return rows.map(row => ({ id: row.id, name: row.name, type: row.type }));
}
