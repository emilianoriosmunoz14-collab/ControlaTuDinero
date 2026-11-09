import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { getAccounts, getOneAccount, postAccount, patchAccount, removeAccount } from '../controllers/account.controller.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.get('/', getAccounts);
accountRouter.post('/', postAccount);
accountRouter.get('/:id', getOneAccount);
accountRouter.patch('/:id', patchAccount);
accountRouter.delete('/:id', removeAccount);
