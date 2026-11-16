import { type ResultSetHeader, type RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

export interface GoalDTO {
  id: number;
  name: string;
  targetAmount: string;
  savedAmount: string;
  remainingAmount: string;
  progressPercent: number;
  completed: boolean;
  targetDate: string | null;
  accountId: number | null;
  accountName: string | null;
}

type GoalRow = RowDataPacket & {
  id: number; name: string; targetAmount: string; savedAmount: string;
  remainingAmount: string; progressPercent: string; completed: number;
  targetDate: string | null; accountId: number | null; accountName: string | null;
};

const selectGoal = `
  SELECT g.id, g.name,
         g.target_amount AS targetAmount,
         g.saved_amount AS savedAmount,
         (g.target_amount - g.saved_amount) AS remainingAmount,
         ROUND(g.saved_amount / g.target_amount * 100, 2) AS progressPercent,
         (g.saved_amount >= g.target_amount) AS completed,
         DATE_FORMAT(g.target_date, '%Y-%m-%d') AS targetDate,
         g.account_id AS accountId,
         a.name AS accountName
  FROM savings_goals g
  LEFT JOIN accounts a ON a.id = g.account_id AND a.user_id = g.user_id
`;

function toDto(row: GoalRow): GoalDTO {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    savedAmount: row.savedAmount,
    remainingAmount: row.remainingAmount,
    progressPercent: Number(row.progressPercent),
    completed: Boolean(row.completed),
    targetDate: row.targetDate,
    accountId: row.accountId,
    accountName: row.accountName,
  };
}

export async function listGoals(userId: number): Promise<GoalDTO[]> {
  const [rows] = await pool.execute<GoalRow[]>(
    `${selectGoal} WHERE g.user_id = ? ORDER BY g.id DESC`,
    [userId]
  );
  return rows.map(toDto);
}

export async function getGoal(userId: number, id: number): Promise<GoalDTO | null> {
  const [rows] = await pool.execute<GoalRow[]>(
    `${selectGoal} WHERE g.id = ? AND g.user_id = ? LIMIT 1`,
    [id, userId]
  );
  return rows[0] ? toDto(rows[0]) : null;
}

export async function createGoal(data: {
  userId: number; accountId: number; name: string; targetAmount: string; targetDate: string | null;
}): Promise<GoalDTO> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO savings_goals (user_id, account_id, name, target_amount, saved_amount, target_date)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [data.userId, data.accountId, data.name, data.targetAmount, data.targetDate]
  );
  const created = await getGoal(data.userId, result.insertId);
  if (!created) throw new Error('No se pudo consultar la meta nueva.');
  return created;
}

export type ContributionResult =
  | { status: 'ok'; goal: GoalDTO }
  | { status: 'not_found' }
  | { status: 'exceeds' };

export async function addContribution(userId: number, id: number, amount: string): Promise<ContributionResult> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE savings_goals
     SET saved_amount = saved_amount + ?
     WHERE id = ? AND user_id = ? AND saved_amount + ? <= target_amount`,
    [amount, id, userId, amount]
  );
  const goal = await getGoal(userId, id);
  if (!goal) return { status: 'not_found' };
  if (result.affectedRows === 0) return { status: 'exceeds' };
  return { status: 'ok', goal };
}