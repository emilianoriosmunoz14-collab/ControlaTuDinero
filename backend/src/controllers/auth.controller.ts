import { createHash, randomBytes } from 'node:crypto';
import { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUserWithCategories, findUserByEmail } from '../repositories/user.repository.js';
import { createSession, revokeSession } from '../repositories/session.repository.js';
import { SESSION_COOKIE, SESSION_HOURS, sessionCookieOptions } from '../config/session.js';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(190),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(190),
  password: z.string().min(1).max(200),
});

const DUMMY_HASH = '$2b$12$2KoXpiRbQ.YdOEJEk3LeL.X.xnS./9iYiLncCoXEWDGzULrWdcine';
const LOGIN_ERROR = 'Correo o contraseña incorrectos';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export async function register(req: Request, res: Response): Promise<void> {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ message: 'Datos de registro inválidos' });
    return;
  }

  const { name, password } = validation.data;
  const email = validation.data.email.toLowerCase();

  if (Buffer.byteLength(password, 'utf8') > 72) {
    res.status(400).json({ message: 'La contraseña es demasiado larga' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await createUserWithCategories({ name, email, passwordHash });
    res.status(201).json({ message: 'Cuenta creada', user });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Este correo ya está registrado' });
      return;
    }
    throw error;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ message: 'Escribe tu correo y tu contraseña' });
    return;
  }

  const { password } = validation.data;
  const email = validation.data.email.toLowerCase();
  const user = await findUserByEmail(email);
  const tooLong = Buffer.byteLength(password, 'utf8') > 72;
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || tooLong || !passwordOk) {
    res.status(401).json({ message: LOGIN_ERROR });
    return;
  }

  const token = randomBytes(32).toString('hex');
  await createSession(user.id, sha256(token), SESSION_HOURS);
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });
  res.status(200).json({
    message: 'Sesión iniciada',
    user: { id: user.id, name: user.name, email: user.email },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
    await revokeSession(sha256(token));
  }
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  res.status(200).json({ message: 'Sesión cerrada' });
}
