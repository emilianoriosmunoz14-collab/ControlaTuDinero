import { type ResultSetHeader, type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

export interface SubcategoryDTO {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
}
type SubcategoryRow = RowDataPacket & SubcategoryDTO;
const selectFields = `s.id, s.category_id AS categoryId,
  c.name AS categoryName, s.name`;

export async function listSubcategories(
  userId: number, categoryId?: number
): Promise<SubcategoryDTO[]> {
  let sql = `SELECT ${selectFields} FROM subcategories s
    INNER JOIN categories c ON c.id = s.category_id WHERE s.user_id = ?`;
  const args: number[] = [userId];
  if (categoryId !== undefined) {
    sql += ' AND s.category_id = ?';
    args.push(categoryId);
  }
  sql += ' ORDER BY c.name, s.name, s.id';
  const [rows] = await pool.execute<SubcategoryRow[]>(sql, args);
  return rows.map(({ id, categoryId, categoryName, name }) =>
    ({ id, categoryId, categoryName, name }));
}

export async function getSubcategory(userId: number, id: number): Promise<SubcategoryDTO | null> {
  const [rows] = await pool.execute<SubcategoryRow[]>(
    `SELECT ${selectFields} FROM subcategories s
     INNER JOIN categories c ON c.id = s.category_id
     WHERE s.id = ? AND s.user_id = ? LIMIT 1`, [id, userId]
  );
  const row = rows[0];
  return row ? {id:row.id,categoryId:row.categoryId,categoryName:row.categoryName,name:row.name} : null;
}

export async function createSubcategory(data: {
  userId: number; categoryId: number; name: string;
}): Promise<SubcategoryDTO> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO subcategories (user_id, category_id, name) VALUES (?, ?, ?)',
    [data.userId, data.categoryId, data.name]
  );
  const created = await getSubcategory(data.userId, result.insertId);
  if (!created) throw new Error('No se pudo consultar la subcategoria nueva.');
  return created;
}

export async function renameSubcategory(
  userId: number, id: number, name: string
): Promise<SubcategoryDTO | null> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE subcategories SET name = ? WHERE id = ? AND user_id = ?',
    [name, id, userId]
  );
  if (result.affectedRows === 0) return null;
  return getSubcategory(userId, id);
}

export async function deleteSubcategory(userId: number, id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM subcategories WHERE id = ? AND user_id = ?', [id, userId]
  );
  return result.affectedRows > 0;
}
