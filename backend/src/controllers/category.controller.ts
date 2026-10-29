import { type Request, type Response } from 'express';
import { listCategories } from '../repositories/category.repository.js';

export async function getCategories(req: Request, res: Response): Promise<void> {
  const categories = await listCategories(req.authUserId!);
  res.status(200).json({ categories });
}
