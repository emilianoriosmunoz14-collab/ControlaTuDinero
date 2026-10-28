import { type ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[API error]', err);
  res.status(500).json({ message: 'Error interno del servidor' });
};
