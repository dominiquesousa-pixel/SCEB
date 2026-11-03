import { z } from 'zod';

const userRole = z.enum(['ALUNO', 'PROFESSOR', 'BIBLIOTECARIO', 'ADMINISTRADOR']);

export const createUserDto = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().length(8),
  role: userRole,
});

export const updateUserDto = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().email().transform((value) => value.toLowerCase()).optional(),
    password: z.string().length(8).optional(),
    role: userRole.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo para atualizar.');