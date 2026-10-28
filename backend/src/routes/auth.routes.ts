import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js'

export const authRouter = Router();
const registerLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10,
  standardHeaders: 'draft-8', legacyHeaders: false });

authRouter.post('/register', registerLimit, register);
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Demasiados intentos. Intenta de nuevo más tarde' } });

authRouter.post('/login', loginLimit, login);
authRouter.post('/logout', requireAuth, logout);