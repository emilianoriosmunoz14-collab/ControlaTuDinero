import { type ResultSetHeader, type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

type TransactionType = 'income' | 'expense';

interface TransactionDTO {
  id: number;
  type: TransactionType;
  amount: string;
  date: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
  accountId: number | null;
  accountName: string | null;
}

interface NewTransaction {
  userId: number;
  categoryId: number;
  subcategoryId: number;
  accountId: number;
  type: TransactionType;
  amount: string;
  date: string;
  description: string;
}

export class TransactionError extends Error {
  constructor(public readonly status: 404 | 409, message: string) {
    super(message);
  }
}

const transactionFields = `
  t.id, t.type, t.amount, t.date, t.description,
         c.id AS categoryId, c.name AS categoryName,
         s.id AS subcategoryId, s.name AS subcategoryName,
         a.id AS accountId, a.name AS accountName`;

const transactionTables = `
  FROM transactions t
  INNER JOIN categories c ON c.id = t.category_id
  LEFT JOIN subcategories s ON s.id = t.subcategory_id
  LEFT JOIN accounts a ON a.id = t.account_id
`;

export async function listTransactionsByUser(userId: number): Promise<TransactionDTO[]> {
  const [rows] = await pool.execute<(RowDataPacket & TransactionDTO)[]>(
    `SELECT ${transactionFields} ${transactionTables} WHERE t.user_id = ? ORDER BY t.date DESC, t.id DESC`,
    [userId],
  );
  return rows;
}

export async function createTransaction(data: NewTransaction) {
  const { userId, categoryId, subcategoryId, accountId, type, amount, date, description } = data;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [accounts] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE',
      [accountId, userId],
    );
    if (accounts.length === 0) {
      throw new TransactionError(404, 'Cuenta no encontrada');
    }

    // MySQL hace el cálculo decimal exacto y valida el rango antes de guardar.
    const delta = type === 'expense' ? `-${amount}` : amount;
    const [updated] = await connection.execute<ResultSetHeader>(
      `UPDATE accounts SET balance = balance + CAST(? AS DECIMAL(12,2))
       WHERE id = ? AND user_id = ?
         AND balance + CAST(? AS DECIMAL(12,2)) BETWEEN 0.00 AND 9999999999.99`,
      [delta, accountId, userId, delta],
    );
    if (updated.affectedRows === 0) {
      const message = type === 'expense' ? 'Saldo insuficiente' : 'El ingreso supera el saldo máximo de la cuenta';
      throw new TransactionError(409, message);
    }

    const [inserted] = await connection.execute<ResultSetHeader>(
      `INSERT INTO transactions (user_id, category_id, subcategory_id, account_id, type, amount, date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, categoryId, subcategoryId, accountId, type, amount, date, description],
    );
    const [rows] = await connection.execute<(RowDataPacket & TransactionDTO & { balance: string })[]>(
      `SELECT ${transactionFields}, a.balance ${transactionTables}
       WHERE t.id = ? AND t.user_id = ?`,
      [inserted.insertId, userId],
    );
    const { balance, ...transaction } = rows[0];
    await connection.commit();
    return { transaction, balance };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
