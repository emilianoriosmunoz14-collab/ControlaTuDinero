import { type ResultSetHeader, type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

interface TransactionRow extends RowDataPacket {
  id: number;
  type: 'income' | 'expense';
  amount: string;
  date: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
}

function toDto(row: TransactionRow) {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    date: row.date,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
  };
}

// categories ya no tiene user_id. La propiedad del movimiento se valida con t.user_id.
const transactionSelect = `
  SELECT t.id, t.type, t.amount, t.date, t.description,
         c.id AS categoryId, c.name AS categoryName
  FROM transactions t
  INNER JOIN categories c ON c.id = t.category_id
`;

export async function listTransactionsByUser(userId: number) {
  const [rows] = await pool.execute<TransactionRow[]>(
    `${transactionSelect} WHERE t.user_id = ? ORDER BY t.date DESC, t.id DESC`,
    [userId],
  );
  return rows.map(toDto);
}

// Compatibilidad temporal: PR 4 añadira accountId y subcategoryId obligatorios,
// y actualizara el saldo dentro de la misma transaccion MySQL.
export async function createTransaction(data: {
  userId: number;
  categoryId: number;
  type: 'income' | 'expense';
  amount: string;
  date: string;
  description: string | null;
}) {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO transactions (user_id, category_id, type, amount, date, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.userId, data.categoryId, data.type, data.amount, data.date, data.description],
  );

  const [rows] = await pool.execute<TransactionRow[]>(
    `${transactionSelect} WHERE t.id = ? AND t.user_id = ? LIMIT 1`,
    [result.insertId, data.userId],
  );
  if (!rows[0]) throw new Error('No se pudo recuperar el gasto recien registrado.');
  return toDto(rows[0]);
}
