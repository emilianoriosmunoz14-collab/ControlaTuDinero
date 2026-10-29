import { type Request, type Response } from 'express';
import { z } from 'zod';
import { createTransaction, listTransactionsByUser } from '../repositories/transaction.repository.js';
import { findCategoryOfUser } from '../repositories/category.repository.js';

export async function getHistory(req: Request, res: Response): Promise<void> {
  const userId = req.authUserId!; // requireAuth garantiza este dato
  const transactions = await listTransactionsByUser(userId);
  res.status(200).json({ transactions });
}

const createExpenseSchema = z.object({
  type: z.literal('expense'),
  amount: z.union([z.string(), z.number()]),
  date: z.string(),
  description: z.string().trim().min(1).max(255),
  categoryId: z.coerce.number().int().positive(),
  }
);

function normalizeAmount(value: string | number): string | null {
  const text = String(value).trim();
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text) || Number(text) <= 0) return null;
  return text;
}

function isRealDate(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!m) return false;
      const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (year < 1900) return false;
      const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  const validation = createExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Datos del gasto inválidos' });
    return;
  }
  const { amount: rawAmount, date, description, categoryId } = validation.data;
  const amount = normalizeAmount(rawAmount);
    if (amount === null) {
      res.status(400).json({ message: 'La cantidad debe ser mayor que cero y tener máximo 2 decimales' });
    return;
  }
    if (!isRealDate(date)) {
      res.status(400).json({ message: 'La fecha no es válida (usa AAAA-MM-DD)' });
    return;
  }

  const userId = req.authUserId!;
  const category = await findCategoryOfUser(userId, categoryId);
    if (!category || category.type !== 'expense') {
      res.status(400).json({ message: 'Selecciona una categoría de gasto válida' });
    return;
  }

  const transaction = await createTransaction({
    userId, categoryId: category.id, type: 'expense', amount, date, description,
    }
  );

  res.status(201).json({ message: 'Gasto registrado', transaction });
  }