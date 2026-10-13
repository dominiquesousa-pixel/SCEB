import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginDto } from '../dto/auth.dto.js';

export const authRouter = Router();

authRouter.get('/me', authenticate, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    response.status(401).json({ error: 'Sessão inválida.' });
    return;
  }

  response.json({ data: user });
});

authRouter.post('/login', validateBody(loginDto), async (request, response) => {
  const { email, password } = request.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    response.status(401).json({ error: 'E-mail ou senha inválidos.' });
    return;
  }

  const token = jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: '8h',
  });

  response.json({
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});