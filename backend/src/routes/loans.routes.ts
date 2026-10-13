import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { libraryStaff } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createLoanDto } from '../dto/loan.dto.js';
import { HttpError } from '../utils/http-error.js';

export const loansRouter = Router();
loansRouter.use(...libraryStaff);

loansRouter.get('/', async (request, response) => {
  const status = request.query.status;
  const loans = await prisma.loan.findMany({
    where: status === 'ACTIVE' || status === 'RETURNED' ? { status } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      book: { select: { id: true, title: true, isbn: true } },
    },
    orderBy: { borrowedAt: 'desc' },
  });
  response.json({ data: loans });
});

loansRouter.get('/:id', async (request, response) => {
  const loan = await prisma.loan.findUnique({
    where: { id: request.params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      book: { select: { id: true, title: true, isbn: true } },
    },
  });
  if (!loan) throw new HttpError(404, 'Empréstimo não encontrado.');
  response.json({ data: loan });
});

loansRouter.post('/', validateBody(createLoanDto), async (request, response) => {
  const input = request.body as { userId: string; bookId: string; dueAt: Date };
  if (input.dueAt <= new Date()) throw new HttpError(400, 'A data de devolução deve ser futura.');

  const loan = await prisma.$transaction(async (transaction) => {
    const bookUpdate = await transaction.book.updateMany({
      where: { id: input.bookId, availableCopies: { gt: 0 } },
      data: { availableCopies: { decrement: 1 } },
    });
    if (bookUpdate.count === 0) {
      const exists = await transaction.book.findUnique({ where: { id: input.bookId }, select: { id: true } });
      throw new HttpError(exists ? 409 : 404, exists ? 'Não há exemplares disponíveis.' : 'Livro não encontrado.');
    }

    return transaction.loan.create({
      data: { ...input, borrowedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        book: { select: { id: true, title: true, isbn: true } },
      },
    });
  });

  response.status(201).json({ data: loan });
});

loansRouter.post('/:id/return', async (request, response) => {
  const loan = await prisma.$transaction(async (transaction) => {
    const current = await transaction.loan.findUnique({ where: { id: request.params.id } });
    if (!current) throw new HttpError(404, 'Empréstimo não encontrado.');
    if (current.status === 'RETURNED') throw new HttpError(409, 'Este empréstimo já foi devolvido.');

    const returned = await transaction.loan.updateMany({
      where: { id: current.id, status: 'ACTIVE' },
      data: { status: 'RETURNED', returnedAt: new Date() },
    });
    if (returned.count === 0) throw new HttpError(409, 'Este empréstimo já foi devolvido.');

    await transaction.book.update({
      where: { id: current.bookId },
      data: { availableCopies: { increment: 1 } },
    });
    return transaction.loan.findUniqueOrThrow({ where: { id: current.id } });
  });

  response.json({ data: loan });
});