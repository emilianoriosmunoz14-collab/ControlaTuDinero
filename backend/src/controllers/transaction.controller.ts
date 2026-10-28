import { type Request, type Response } from 'express';
import { listTransactionsByUser } from '../repositories/transaction.repository.js';

export async function getHistory(req: Request, res: Response): Promise<void> {
  const userId = req.authUserId!; // requireAuth garantiza este dato
  const transactions = await listTransactionsByUser(userId);
  res.status(200).json({ transactions });
}
