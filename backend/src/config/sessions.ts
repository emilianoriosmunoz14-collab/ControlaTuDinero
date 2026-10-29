import { type CookieOptions } from 'express';
import { env } from './env.js';

export const SESSION_COOKIE = 'ctd_session';
export const SESSION_HOURS = 8;

// Mismos atributos al emitir y al borrar la cookie (si no coinciden, el navegador no la borra).
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  path: '/',
};