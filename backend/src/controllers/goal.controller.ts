import { type Request, type Response } from 'express';
import { z } from 'zod';
import { getAccount } from '../repositories/account.repository.js';
import { addContribution, createGoal, getGoal, listGoals } from '../repositories/goal.repository.js';

const newGoalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: z.union([z.string(), z.number()]),
  targetDate: z.string().nullable().optional(),
  accountId: z.coerce.number().int().positive(),
});
const contributionSchema = z.object({
  amount: z.union([z.string(), z.number()]),
});

function positiveMoney(value: string | number): string | null {
  const text = String(value).trim();
  if (!/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/.test(text) || Number(text) <= 0) return null;
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

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function getGoals(req: Request, res: Response): Promise<void> {
  res.status(200).json({ goals: await listGoals(req.authUserId!) });
}

export async function getOneGoal(req: Request, res: Response): Promise<void> {
  const id = positiveId(req.params.id);
  if (!id) { res.status(400).json({ message: 'ID de meta inválido' }); return; }
  const goal = await getGoal(req.authUserId!, id);
  if (!goal) { res.status(404).json({ message: 'Meta no encontrada' }); return; }
  res.status(200).json({ goal });
}

export async function postGoal(req: Request, res: Response): Promise<void> {
  const parsed = newGoalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Datos de la meta inválidos' }); return; }

  const targetAmount = positiveMoney(parsed.data.targetAmount);
  if (targetAmount === null) {
    res.status(400).json({ message: 'El monto objetivo debe ser mayor que cero, con máximo 2 decimales' });
    return;
  }
  const targetDate = parsed.data.targetDate ?? null;
  if (targetDate !== null && !isRealDate(targetDate)) {
    res.status(400).json({ message: 'La fecha no es válida (usa AAAA-MM-DD)' });
    return;
  }

  const userId = req.authUserId!;
  const account = await getAccount(userId, parsed.data.accountId);
  if (!account) { res.status(404).json({ message: 'Cuenta no encontrada' }); return; }

  const goal = await createGoal({
    userId, accountId: account.id, name: parsed.data.name, targetAmount, targetDate,
  });
  res.status(201).json({ message: 'Meta creada', goal });
}

export async function postContribution(req: Request, res: Response): Promise<void> {
  const id = positiveId(req.params.id);
  const parsed = contributionSchema.safeParse(req.body);
  if (!id || !parsed.success) { res.status(400).json({ message: 'Datos del aporte inválidos' }); return; }

  const amount = positiveMoney(parsed.data.amount);
  if (amount === null) {
    res.status(400).json({ message: 'El aporte debe ser mayor que cero, con máximo 2 decimales' });
    return;
  }

  const result = await addContribution(req.authUserId!, id, amount);
  if (result.status === 'not_found') { res.status(404).json({ message: 'Meta no encontrada' }); return; }
  if (result.status === 'exceeds') {
    res.status(400).json({ message: 'El aporte supera la cantidad pendiente de la meta' });
    return;
  }
  res.status(200).json({ message: 'Aporte registrado', goal: result.goal });
}