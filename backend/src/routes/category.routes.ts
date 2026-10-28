import { Router } from 'express';
import { getCategories } from '../controllers/category.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const categoryRouter = Router();
categoryRouter.get('/', requireAuth, getCategories);
