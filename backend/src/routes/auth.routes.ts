import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { register } from '../controllers/auth.controller.js';

export const authRouter = Router();
const registerLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10,
  standardHeaders: 'draft-8', legacyHeaders: false });

authRouter.post('/register', registerLimit, register);
// Emiliano agregará POST /login y POST /logout aquí, en su propia rama.
