import { z } from 'zod';

export const createLoanDto = z.object({
  userId: z.string().min(1),
  bookId: z.string().min(1),
  dueAt: z.coerce.date(),
});