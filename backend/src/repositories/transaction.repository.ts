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


interface ExistingTransactionRow extends RowDataPacket {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: string;
}

function amountToCents(amount: string): bigint {
  const [whole, decimal = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
}

function centsToAmount(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const decimal = String(absolute % 100n).padStart(2, '0');

  return `${negative ? '-' : ''}${whole}.${decimal}`;
}

function balanceDelta(type: TransactionType, amount: string): bigint {
  const cents = amountToCents(amount);
  return type === 'income' ? cents : -cents;
}

async function lockAccounts(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  userId: number,
  accountIds: number[],
): Promise<void> {
  const ids = [...new Set(accountIds)].sort((a, b) => a - b);

  for (const id of ids) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE',
      [id, userId],
    );

    if (rows.length === 0) {
      throw new TransactionError(404, 'Cuenta no encontrada');
    }
  }
}

async function applyBalanceDelta(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  userId: number,
  accountId: number,
  delta: bigint,
): Promise<void> {
  if (delta === 0n) return;

  const amount = centsToAmount(delta);

  const [updated] = await connection.execute<ResultSetHeader>(
    `UPDATE accounts
     SET balance = balance + CAST(? AS DECIMAL(12,2))
     WHERE id = ? AND user_id = ?
       AND balance + CAST(? AS DECIMAL(12,2))
       BETWEEN 0.00 AND 9999999999.99`,
    [amount, accountId, userId, amount],
  );

  if (updated.affectedRows === 0) {
    throw new TransactionError(
      409,
      'El saldo de la cuenta no permite realizar este cambio',
    );
  }
}

export async function updateTransaction(
  userId: number,
  id: number,
  data: NewTransaction,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [transactions] = await connection.execute<ExistingTransactionRow[]>(
      `SELECT id, account_id, type, amount
       FROM transactions
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [id, userId],
    );

    const previous = transactions[0];

    if (!previous) {
      throw new TransactionError(404, 'Movimiento no encontrado');
    }

    await lockAccounts(connection, userId, [
      previous.account_id,
      data.accountId,
    ]);

    const previousDelta = balanceDelta(
      previous.type,
      previous.amount,
    );

    const newDelta = balanceDelta(data.type, data.amount);

    if (previous.account_id === data.accountId) {
      await applyBalanceDelta(
        connection,
        userId,
        data.accountId,
        newDelta - previousDelta,
      );
    } else {
      await applyBalanceDelta(
        connection,
        userId,
        previous.account_id,
        -previousDelta,
      );

      await applyBalanceDelta(
        connection,
        userId,
        data.accountId,
        newDelta,
      );
    }

    await connection.execute(
      `UPDATE transactions
       SET category_id = ?,
           subcategory_id = ?,
           account_id = ?,
           type = ?,
           amount = ?,
           date = ?,
           description = ?
       WHERE id = ? AND user_id = ?`,
      [
        data.categoryId,
        data.subcategoryId,
        data.accountId,
        data.type,
        data.amount,
        data.date,
        data.description,
        id,
        userId,
      ],
    );

    const [rows] = await connection.execute<
      (RowDataPacket & TransactionDTO & { balance: string })[]
    >(
      `SELECT ${transactionFields}, a.balance ${transactionTables}
       WHERE t.id = ? AND t.user_id = ?`,
      [id, userId],
    );

    await connection.commit();

    return {
      transaction: rows[0],
      balance: rows[0].balance,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteTransaction(
  userId: number,
  id: number,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [transactions] = await connection.execute<ExistingTransactionRow[]>(
      `SELECT id, account_id, type, amount
       FROM transactions
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [id, userId],
    );

    const previous = transactions[0];

    if (!previous) {
      throw new TransactionError(404, 'Movimiento no encontrado');
    }

    await lockAccounts(connection, userId, [previous.account_id]);

    const previousDelta = balanceDelta(
      previous.type,
      previous.amount,
    );

    await applyBalanceDelta(
      connection,
      userId,
      previous.account_id,
      -previousDelta,
    );

    await connection.execute(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId],
    );

    const [accounts] = await connection.execute<
      (RowDataPacket & { balance: string })[]
    >(
      'SELECT balance FROM accounts WHERE id = ? AND user_id = ?',
      [previous.account_id, userId],
    );

    await connection.commit();

    return {
      balance: accounts[0].balance,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}