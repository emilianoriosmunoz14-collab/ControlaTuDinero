import { type Request, type Response } from 'express';
import { z } from 'zod';
import { findCategoryOfUser } from '../repositories/category.repository.js';
import { createSubcategory, deleteSubcategory, getSubcategory, listSubcategories, renameSubcategory } from '../repositories/subcategory.repository.js';

const newSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(80)
});
const renameSchema = z.object({ name: z.string().trim().min(1).max(80) });
function idFrom(value: unknown): number | null {
  const num = Number(value);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}
function codeIs(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export async function getSubcategories(req: Request, res: Response): Promise<void> {
  const raw = req.query.categoryId;
  const categoryId = raw === undefined ? undefined : idFrom(raw);
  if (categoryId === null) { res.status(400).json({ message: 'categoryId invalido' }); return; }
  const subcategories = await listSubcategories(req.authUserId!, categoryId);
  res.status(200).json({ subcategories });
}
export async function postSubcategory(req: Request, res: Response): Promise<void> {
  const parsed = newSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Datos de subcategoria invalidos' }); return; }
  const category = await findCategoryOfUser(req.authUserId!, parsed.data.categoryId);
  if (!category) { res.status(400).json({ message: 'Categoria general inexistente' }); return; }
  try {
    const subcategory = await createSubcategory({
      userId:req.authUserId!,categoryId:parsed.data.categoryId,name:parsed.data.name
    });
    res.status(201).json({ message: 'Subcategoria creada', subcategory });
  } catch (error) {
    if (codeIs(error, 'ER_DUP_ENTRY')) {
      res.status(409).json({ message: 'Ya existe esa subcategoria en esta categoria' });
      return;
    }
    throw error;
  }
}
export async function patchSubcategory(req: Request, res: Response): Promise<void> {
  const id = idFrom(req.params.id);
  const parsed = renameSchema.safeParse(req.body);
  if (!id || !parsed.success) { res.status(400).json({ message: 'Datos invalidos' }); return; }
  try {
    const subcategory = await renameSubcategory(req.authUserId!,id,parsed.data.name);
    if (!subcategory) { res.status(404).json({ message: 'Subcategoria no encontrada' }); return; }
    res.status(200).json({ subcategory });
  } catch(error) {
    if (codeIs(error,'ER_DUP_ENTRY')) {
      res.status(409).json({ message: 'Ya existe esa subcategoria en esta categoria' });
      return;
    }
    throw error;
  }
}
export async function removeSubcategory(req: Request, res: Response): Promise<void> {
  const id = idFrom(req.params.id);
  if (!id) { res.status(400).json({ message: 'ID invalido' }); return; }
  try {
    const deleted = await deleteSubcategory(req.authUserId!,id);
    if (!deleted) { res.status(404).json({ message: 'Subcategoria no encontrada' }); return; }
    res.status(200).json({ message: 'Subcategoria eliminada' });
  } catch(error) {
    if (codeIs(error, 'ER_ROW_IS_REFERENCED_2')) {
      res.status(409).json({ message: 'La subcategoria tiene movimientos y no se puede eliminar' });
      return;
    }
    throw error;
  }
}
