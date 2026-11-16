import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { getGoals, getOneGoal, postContribution, postGoal } from '../controllers/goal.controller.js';

export const goalRouter = Router();
goalRouter.use(requireAuth);
goalRouter.get('/', getGoals);
goalRouter.post('/', postGoal);
goalRouter.get('/:id', getOneGoal);
goalRouter.post('/:id/contributions', postContribution);