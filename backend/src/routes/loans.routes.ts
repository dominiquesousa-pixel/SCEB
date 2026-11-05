import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createLoanDto } from '../dto/loan.dto.js';
import { updateLoanDto } from '../dto/loan-update.dto.js';
import { HttpError } from '../utils/http-error.js';

export const loansRouter = Router();
loansRouter.use(authenticate);
const libraryStaffOnly = authorizeRoles('BIBLIOTECARIO', 'ADMINISTRADOR');
const administratorOnly = authorizeRoles('ADMINISTRADOR');

loansRouter.get('/', async (request, response) => {
  const status = request.query.status;
  const where: Prisma.LoanWhereInput = {};
  if (status === 'ACTIVE' || status === 'RETURNED') where.status = status;
  if (request.auth!.role === 'ALUNO' || request.auth!.role === 'PROFESSOR') {
    where.userId = request.auth!.userId;
  }
  const loans = await prisma.loan.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      book: { select: { id: true, title: true, isbn: true } },
    },
    orderBy: { borrowedAt: 'desc' },
  });
  response.json({ data: loans });
});

loansRouter.get('/:id', async (request, response) => {
  const loan = await prisma.loan.findFirst({
    where: {
      id: String(request.params.id),
      ...(request.auth!.role === 'ALUNO' || request.auth!.role === 'PROFESSOR'
        ? { userId: request.auth!.userId }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      book: { select: { id: true, title: true, isbn: true } },
    },
  });
  if (!loan) throw new HttpError(404, 'Empréstimo não encontrado.');
  response.json({ data: loan });
});

loansRouter.post('/', libraryStaffOnly, validateBody(createLoanDto), async (request, response) => {
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

loansRouter.patch('/:id', administratorOnly, validateBody(updateLoanDto), async (request, response) => {
  const input = request.body as {
    userId?: string;
    bookId?: string;
    borrowedAt?: Date;
    dueAt?: Date;
    status?: 'ACTIVE' | 'RETURNED';
  };
  const loanId = String(request.params.id);
  const loan = await prisma.$transaction(async (transaction) => {
    const current = await transaction.loan.findUnique({ where: { id: loanId } });
    if (!current) throw new HttpError(404, 'Empréstimo não encontrado.');

    const borrowedAt = input.borrowedAt ?? current.borrowedAt;
    const dueAt = input.dueAt ?? current.dueAt;
    if (borrowedAt > new Date()) {
      throw new HttpError(400, 'A data do empréstimo não pode ser futura.');
    }
    if (dueAt <= borrowedAt) {
      throw new HttpError(400, 'A data de devolução deve ser posterior à data do empréstimo.');
    }

    const bookId = input.bookId ?? current.bookId;
    const status = input.status ?? current.status;
    const changingBooks = bookId !== current.bookId;
    const activatingLoan = current.status === 'RETURNED' && status === 'ACTIVE';
    const returningLoan = current.status === 'ACTIVE' && status === 'RETURNED';

    if (changingBooks && status === 'ACTIVE') {
      const newBook = await transaction.book.findUnique({ where: { id: bookId }, select: { id: true } });
      if (!newBook) throw new HttpError(404, 'Livro não encontrado.');
      const reservedCopy = await transaction.book.updateMany({
        where: { id: bookId, availableCopies: { gt: 0 } },
        data: { availableCopies: { decrement: 1 } },
      });
      if (reservedCopy.count === 0) throw new HttpError(409, 'Não há exemplares disponíveis para o novo livro.');
    } else if (activatingLoan) {
      const reservedCopy = await transaction.book.updateMany({
        where: { id: bookId, availableCopies: { gt: 0 } },
        data: { availableCopies: { decrement: 1 } },
      });
      if (reservedCopy.count === 0) {
        const exists = await transaction.book.findUnique({ where: { id: bookId }, select: { id: true } });
        throw new HttpError(exists ? 409 : 404, exists ? 'Não há exemplares disponíveis.' : 'Livro não encontrado.');
      }
    }

    if (current.status === 'ACTIVE' && (changingBooks || returningLoan)) {
      await transaction.book.update({
        where: { id: current.bookId },
        data: { availableCopies: { increment: 1 } },
      });
    }

    return transaction.loan.update({
      where: { id: current.id },
      data: {
        ...input,
        bookId,
        borrowedAt,
        dueAt,
        status,
        returnedAt: status === 'ACTIVE' ? null : current.returnedAt ?? new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        book: { select: { id: true, title: true, isbn: true } },
      },
    });
  });

  response.json({ data: loan });
});

loansRouter.delete('/:id', administratorOnly, async (request, response) => {
  await prisma.$transaction(async (transaction) => {
    const current = await transaction.loan.findUnique({ where: { id: String(request.params.id) } });
    if (!current) throw new HttpError(404, 'Empréstimo não encontrado.');

    if (current.status === 'ACTIVE') {
      await transaction.book.update({
        where: { id: current.bookId },
        data: { availableCopies: { increment: 1 } },
      });
    }
    await transaction.loan.delete({ where: { id: current.id } });
  });
  response.status(204).end();
});

loansRouter.post('/:id/return', libraryStaffOnly, async (request, response) => {
  const loan = await prisma.$transaction(async (transaction) => {
    const current = await transaction.loan.findUnique({ where: { id: String(request.params.id) } });
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