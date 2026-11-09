import { type Request, type Response } from 'express';
import { z } from 'zod';
import { createAccount, deleteAccount, getAccount, listAccounts, updateAccount } from '../repositories/account.repository.js';

// Por ahora NO habilitamos credito: no es un saldo de efectivo ordinario.
const accountTypes = z.enum(['cash', 'debit', 'savings', 'informal']);
const money = z.union([z.string(), z.number()]);
const newAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  accountType: accountTypes,
  openingBalance: money.optional(),
});
const editAccountSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  accountType: accountTypes.optional(),
}).refine(data => data.name !== undefined || data.accountType !== undefined);

function normalizedMoney(value: string | number | undefined): string | null {
  if (value === undefined) return '0.00';
  const text = String(value).trim();
  if (!/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/.test(text)) return null;
  // DECIMAL(12,2): conservar la representacion exacta como texto.
  return text;
}
function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function isDuplicate(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'ER_DUP_ENTRY';
}
function isReferenced(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err &&
    (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED');
}

export async function getAccounts(req: Request, res: Response): Promise<void> {
  res.status(200).json({ accounts: await listAccounts(req.authUserId!) });
}
export async function getOneAccount(req: Request, res: Response): Promise<void> {
  const id = positiveId(req.params.id);
  if (!id) { res.status(400).json({ message: 'ID de cuenta invalido' }); return; }
  const account = await getAccount(req.authUserId!, id);
  if (!account) { res.status(404).json({ message: 'Cuenta no encontrada' }); return; }
  res.status(200).json({ account });
}
export async function postAccount(req: Request, res: Response): Promise<void> {
  const parsed = newAccountSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Datos de cuenta invalidos' }); return; }
  const openingBalance = normalizedMoney(parsed.data.openingBalance);
  if (openingBalance === null) {
    res.status(400).json({ message: 'El saldo inicial debe ser positivo o cero, con maximo 2 decimales' });
    return;
  }
  try {
    const account = await createAccount({
      userId: req.authUserId!, name: parsed.data.name,
      accountType: parsed.data.accountType, openingBalance
    });
    res.status(201).json({ message: 'Cuenta creada', account });
  } catch (error) {
    if (isDuplicate(error)) { res.status(409).json({ message: 'Ya tienes una cuenta con ese nombre' }); return; }
    throw error;
  }
}
export async function patchAccount(req: Request, res: Response): Promise<void> {
  const id = positiveId(req.params.id);
  const parsed = editAccountSchema.safeParse(req.body);
  if (!id || !parsed.success) { res.status(400).json({ message: 'Datos de cuenta invalidos' }); return; }
  try {
    const account = await updateAccount({
      userId: req.authUserId!, id,
      name: parsed.data.name, accountType: parsed.data.accountType
    });
    if (!account) { res.status(404).json({ message: 'Cuenta no encontrada' }); return; }
    res.status(200).json({ account });
  } catch (error) {
    if (isDuplicate(error)) { res.status(409).json({ message: 'Ya tienes una cuenta con ese nombre' }); return; }
    throw error;
  }
}
export async function removeAccount(req: Request, res: Response): Promise<void> {
  const id = positiveId(req.params.id);
  if (!id) { res.status(400).json({ message: 'ID de cuenta invalido' }); return; }
  try {
    const deleted = await deleteAccount(req.authUserId!, id);
    if (!deleted) { res.status(404).json({ message: 'Cuenta no encontrada' }); return; }
    res.status(200).json({ message: 'Cuenta eliminada' });
  } catch (error) {
    if (isReferenced(error)) {
      res.status(409).json({ message: 'No puedes eliminar una cuenta usada por movimientos o metas' });
      return;
    }
    throw error;
  }
}
