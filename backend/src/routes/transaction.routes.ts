import { Router } from 'express';
import { createExpense, getHistory } from '../controllers/transaction.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const transactionRouter = Router();

transactionRouter.get('/', requireAuth, getHistory);
transactionRouter.post('/', requireAuth, createExpense);
