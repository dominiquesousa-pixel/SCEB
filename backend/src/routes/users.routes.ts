import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { libraryStaff } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createUserDto, updateUserDto } from '../dto/user.dto.js';

export const usersRouter = Router();
usersRouter.use(...libraryStaff);

const publicUser = { id: true, name: true, email: true, role: true, createdAt: true } as const;

usersRouter.get('/', async (request, response) => {
  const role = typeof request.query.role === 'string' ? request.query.role : undefined;
  const users = await prisma.user.findMany({
    where: role ? { role: role as 'ALUNO' | 'PROFESSOR' | 'BIBLIOTECARIO' | 'ADMINISTRADOR' } : undefined,
    select: publicUser,
    orderBy: { name: 'asc' },
  });
  response.json({ data: users });
});

usersRouter.get('/:id', async (request, response) => {
  const user = await prisma.user.findUnique({ where: { id: String(request.params.id) }, select: publicUser });
  if (!user) {
    response.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }
  response.json({ data: user });
});

usersRouter.post('/', validateBody(createUserDto), async (request, response) => {
  const input = request.body as {
    name: string;
    email: string;
    password: string;
    role: 'ALUNO' | 'PROFESSOR' | 'BIBLIOTECARIO' | 'ADMINISTRADOR';
  };
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role,
    },
    select: publicUser,
  });
  response.status(201).json({ data: user });
});

usersRouter.patch('/:id', validateBody(updateUserDto), async (request, response) => {
  const input = request.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: 'ALUNO' | 'PROFESSOR' | 'BIBLIOTECARIO' | 'ADMINISTRADOR';
  };
  const { password, ...fields } = input;
  const user = await prisma.user.update({
    where: { id: String(request.params.id) },
    data: {
      ...fields,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
    select: publicUser,
  });
  response.json({ data: user });
});

usersRouter.delete('/:id', async (request, response) => {
  await prisma.user.delete({ where: { id: String(request.params.id) } });
  response.status(204).end();
});