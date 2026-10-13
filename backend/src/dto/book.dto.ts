import { z } from 'zod';

export const createBookDto = z.object({
  title: z.string().trim().min(1).max(200),
  isbn: z.string().trim().min(10).max(17),
  publisher: z.string().trim().max(120).optional(),
  publicationYear: z.number().int().min(1).max(9999).optional(),
  copies: z.number().int().positive(),
  categoryId: z.string().min(1),
});

export const updateBookDto = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    isbn: z.string().trim().min(10).max(17).optional(),
    publisher: z.string().trim().max(120).nullable().optional(),
    publicationYear: z.number().int().min(1).max(9999).nullable().optional(),
    copies: z.number().int().positive().optional(),
    categoryId: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo para atualizar.');