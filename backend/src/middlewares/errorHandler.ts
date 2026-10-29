import { type ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido' });
  return;
  }

  if (err?.type === 'entity.too.large') {
    res.status(413).json({ message: 'La petición es demasiado grande' });
    return;
  }

  console.error('[API error]', err);
  res.status(500).json({ message: 'Error interno del servidor' });
};
