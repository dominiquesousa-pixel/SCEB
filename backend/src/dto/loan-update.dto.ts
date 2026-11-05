import { z } from 'zod';

export const updateLoanDto = z
  .object({
    userId: z.string().min(1).optional(),
    bookId: z.string().min(1).optional(),
    borrowedAt: z.coerce.date().optional(),
    dueAt: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'RETURNED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo para atualizar.');
