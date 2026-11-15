import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { getSubcategories, postSubcategory, patchSubcategory, removeSubcategory } from '../controllers/subcategory.controller.js';

export const subcategoryRouter = Router();
subcategoryRouter.use(requireAuth);
subcategoryRouter.get('/', getSubcategories);
subcategoryRouter.post('/', postSubcategory);
subcategoryRouter.patch('/:id', patchSubcategory);
subcategoryRouter.delete('/:id', removeSubcategory);
