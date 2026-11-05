import { type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';
import { type CategoryDTO } from '../contracts/category.contract.js';

// Estructura de una fila recuperada de MySQL.
interface CategoryRow extends RowDataPacket, CategoryDTO {}

// Convierte una fila de MySQL al contrato público.
function toCategoryDTO(row: CategoryRow): CategoryDTO {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
  };
}

// Consulta las categorías del usuario autenticado.
export async function listCategories(
  userId: number
): Promise<CategoryDTO[]> {
  const [rows] = await pool.execute<CategoryRow[]>(
    'SELECT id, name, type FROM categories WHERE user_id = ? ORDER BY type, name',
    [userId]
  );

  return rows.map(toCategoryDTO);
}

// Busca una categoría específica que pertenezca al usuario.
export async function findCategoryOfUser(
  userId: number,
  categoryId: number
): Promise<CategoryDTO | null> {
  const [rows] = await pool.execute<CategoryRow[]>(
    'SELECT id, name, type FROM categories WHERE id = ? AND user_id = ? LIMIT 1',
    [categoryId, userId]
  );

  return rows[0] ? toCategoryDTO(rows[0]) : null;
}