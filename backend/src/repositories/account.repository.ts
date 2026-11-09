import { type ResultSetHeader, type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

export interface AccountDTO {
  id: number;
  name: string;
  accountType: string;
  openingBalance: string;
  balance: string;
}

type AccountRow = RowDataPacket & AccountDTO;
const selectFields = `id, name, account_type AS accountType,
  opening_balance AS openingBalance, balance`;

export async function listAccounts(userId: number): Promise<AccountDTO[]> {
  const [rows] = await pool.execute<AccountRow[]>(
    `SELECT ${selectFields} FROM accounts WHERE user_id = ? ORDER BY name, id`,
    [userId]
  );
  return rows.map(({id, name, accountType, openingBalance, balance}) =>
    ({id, name, accountType, openingBalance, balance}));
}

export async function getAccount(userId: number, id: number): Promise<AccountDTO | null> {
  const [rows] = await pool.execute<AccountRow[]>(
    `SELECT ${selectFields} FROM accounts WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  const item = rows[0];
  return item ? {id:item.id,name:item.name,accountType:item.accountType,
    openingBalance:item.openingBalance,balance:item.balance} : null;
}

export async function createAccount(data: {
  userId: number; name: string; accountType: string; openingBalance: string;
}): Promise<AccountDTO> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO accounts (user_id, name, account_type, opening_balance, balance)
     VALUES (?, ?, ?, ?, ?)`,
    [data.userId, data.name, data.accountType, data.openingBalance, data.openingBalance]
  );
  const created = await getAccount(data.userId, result.insertId);
  if (!created) throw new Error('No se pudo consultar la cuenta nueva.');
  return created;
}

export async function updateAccount(data: {
  userId: number; id: number; name?: string; accountType?: string;
}): Promise<AccountDTO | null> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE accounts
     SET name = COALESCE(?, name), account_type = COALESCE(?, account_type)
     WHERE id = ? AND user_id = ?`,
    [data.name ?? null, data.accountType ?? null, data.id, data.userId]
  );
  if (result.affectedRows === 0) return null;
  return getAccount(data.userId, data.id);
}

export async function deleteAccount(userId: number, id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM accounts WHERE id = ? AND user_id = ?', [id, userId]
  );
  return result.affectedRows > 0;
}
