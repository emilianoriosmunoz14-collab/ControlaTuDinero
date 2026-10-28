import { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUserWithCategories } from '../repositories/user.repository.js';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(190),
  password: z.string().min(8).max(72),
});

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
    if (typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Este correo ya está registrado' });
      return;
    }
    throw error;
  }
}
