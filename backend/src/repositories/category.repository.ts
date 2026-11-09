import { type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';
import { type CategoryDTO } from '../contracts/category.contract.js';

type CategoryRow = RowDataPacket & CategoryDTO;

function toCategoryDTO(row: CategoryRow): CategoryDTO {
  return { id: row.id, name: row.name, type: row.type };
}

// El argumento queda por compatibilidad con el controlador actual.
// A partir del Sprint 3 las categorias son compartidas.
export async function listCategories(_userId: number): Promise<CategoryDTO[]> {
  const [rows] = await pool.execute<CategoryRow[]>(
    'SELECT id, name, type FROM categories ORDER BY type, name'
  );
  return rows.map(toCategoryDTO);
}

// El primer argumento queda por compatibilidad con transaction.controller.ts.
export async function findCategoryOfUser(
  _userId: number, categoryId: number
): Promise<CategoryDTO | null> {
  const [rows] = await pool.execute<CategoryRow[]>(
    'SELECT id, name, type FROM categories WHERE id = ? LIMIT 1',
    [categoryId]
  );
  return rows[0] ? toCategoryDTO(rows[0]) : null;
}
