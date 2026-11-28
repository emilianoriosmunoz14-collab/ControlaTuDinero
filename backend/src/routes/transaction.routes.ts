
import { Router } from 'express';
import {
  postTransaction,
  getHistory,
  putTransaction,
  deleteTransactionHandler,
} from '../controllers/transaction.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const transactionRouter = Router();

transactionRouter.get('/', requireAuth, getHistory);
transactionRouter.post('/', requireAuth, postTransaction);
transactionRouter.put('/:id', requireAuth, putTransaction);
transactionRouter.delete('/:id', requireAuth, deleteTransactionHandler);