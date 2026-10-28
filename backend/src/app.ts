import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { transactionRouter } from './routes/transaction.routes.js';
import { categoryRouter } from './routes/category.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

// Defensa inicial contra peticiones cross-site que cambian información.
// Frontend y backend deben compartir el mismo sitio en el despliegue.
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      origin && origin !== env.frontendOrigin) {
    res.status(403).json({ message: 'Origen no permitido' });
    return;
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ControlaTuDinero API' });
});
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/categories', categoryRouter);
app.use((_req, res) => { res.status(404).json({ message: 'Ruta no encontrada' }); });
app.use(errorHandler);
