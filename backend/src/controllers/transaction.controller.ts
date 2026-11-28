
import { type Request, type Response } from 'express';
import { z } from 'zod';
import { findCategoryOfUser } from '../repositories/category.repository.js';
import { getSubcategory } from '../repositories/subcategory.repository.js';
import {
  createTransaction,
  listTransactionsByUser,
  TransactionError,
  updateTransaction,
  deleteTransaction as removeTransaction,
} from '../repositories/transaction.repository.js';

export async function getHistory(req: Request, res: Response): Promise<void> {
  const transactions = await listTransactionsByUser(req.authUserId!);
  res.status(200).json({ transactions });
}

const positiveId = z.union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number)
  .pipe(z.number().int().positive().max(4_294_967_295));

const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.union([z.string(), z.number()]).transform(value => String(value).trim()),
  date: z.iso.date().refine(date => Number(date.slice(0, 4)) >= 1900),
  description: z.string().trim().min(1).max(255),
  categoryId: positiveId,
  subcategoryId: positiveId,
  accountId: positiveId,
});

function handleTransactionError(error: unknown, res: Response): boolean {
  if (error instanceof TransactionError) {
    res.status(error.status).json({ message: error.message });
    return true;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ER_NO_REFERENCED_ROW' ||
      error.code === 'ER_NO_REFERENCED_ROW_2')
  ) {
    res.status(400).json({
      message: 'La categoria o subcategoria ya no esta disponible',
    });
    return true;
  }

  return false;
}

async function validateCategoryAndSubcategory(
  userId: number,
  type: 'income' | 'expense',
  categoryId: number,
  subcategoryId: number,
  res: Response,
): Promise<boolean> {
  const category = await findCategoryOfUser(userId, categoryId);

  if (!category || category.type !== type) {
    res.status(400).json({
      message: 'Selecciona una categoria del mismo tipo que el movimiento',
    });
    return false;
  }

  const subcategory = await getSubcategory(userId, subcategoryId);

  if (!subcategory || subcategory.categoryId !== categoryId) {
    res.status(400).json({
      message: 'Selecciona una subcategoria de la categoria indicada',
    });
    return false;
  }

  return true;
}

export async function postTransaction(req: Request, res: Response): Promise<void> {
  const validation = createTransactionSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      message: 'Completa los datos del movimiento con una fecha valida, cuenta, categoria y subcategoria',
    });
    return;
  }

  const {
    type,
    amount,
    date,
    description,
    categoryId,
    subcategoryId,
    accountId,
  } = validation.data;

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    res.status(400).json({
      message: 'La cantidad debe ser mayor que cero y tener maximo 2 decimales',
    });
    return;
  }

  const userId = req.authUserId!;

  const validCategory = await validateCategoryAndSubcategory(
    userId,
    type,
    categoryId,
    subcategoryId,
    res,
  );

  if (!validCategory) return;

  try {
    const result = await createTransaction({
      userId,
      type,
      amount,
      date,
      description,
      categoryId,
      subcategoryId,
      accountId,
    });

    res.status(201).json({
      message: type === 'income' ? 'Ingreso registrado' : 'Gasto registrado',
      ...result,
    });
  } catch (error) {
    if (!handleTransactionError(error, res)) throw error;
  }
}

export async function putTransaction(req: Request, res: Response): Promise<void> {
  const idValidation = positiveId.safeParse(req.params.id);

  if (!idValidation.success) {
    res.status(400).json({ message: 'ID de movimiento no valido' });
    return;
  }

  const validation = createTransactionSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      message: 'Completa todos los datos del movimiento correctamente',
    });
    return;
  }

  const {
    type,
    amount,
    date,
    description,
    categoryId,
    subcategoryId,
    accountId,
  } = validation.data;

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    res.status(400).json({
      message: 'La cantidad debe ser mayor que cero y tener maximo 2 decimales',
    });
    return;
  }

  const userId = req.authUserId!;

  const validCategory = await validateCategoryAndSubcategory(
    userId,
    type,
    categoryId,
    subcategoryId,
    res,
  );

  if (!validCategory) return;

  try {
    const result = await updateTransaction(userId, idValidation.data, {
      userId,
      type,
      amount,
      date,
      description,
      categoryId,
      subcategoryId,
      accountId,
    });

    res.status(200).json({
      message: 'Movimiento actualizado correctamente',
      ...result,
    });
  } catch (error) {
    if (!handleTransactionError(error, res)) throw error;
  }
}

export async function deleteTransactionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const idValidation = positiveId.safeParse(req.params.id);

  if (!idValidation.success) {
    res.status(400).json({ message: 'ID de movimiento no valido' });
    return;
  }

  try {
    const result = await removeTransaction(
      req.authUserId!,
      idValidation.data,
    );

    res.status(200).json({
      message: 'Movimiento eliminado correctamente',
      ...result,
    });
  } catch (error) {
    if (!handleTransactionError(error, res)) throw error;
  }
}
