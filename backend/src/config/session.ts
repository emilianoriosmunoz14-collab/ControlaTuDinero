import { type CookieOptions } from 'express';
import { env } from './env.js';

export const SESSION_COOKIE = 'ctd_session';
export const SESSION_HOURS = 8;

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  path: '/',
};
