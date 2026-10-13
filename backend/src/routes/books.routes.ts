import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, libraryStaff } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createBookDto, updateBookDto } from '../dto/book.dto.js';
import { HttpError } from '../utils/http-error.js';

export const booksRouter = Router();
const bookView = {
  id: true,
  title: true,
  isbn: true,
  publisher: true,
  publicationYear: true,
  copies: true,
  availableCopies: true,
  category: { select: { id: true, name: true } },
} satisfies Prisma.BookSelect;

booksRouter.use(authenticate);

booksRouter.get('/', async (request, response) => {
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  const books = await prisma.book.findMany({
    where: search
      ? {
          OR: [
            { title: { contains: search } },
            { isbn: { contains: search } },
            { category: { name: { contains: search } } },
          ],
        }
      : undefined,
    select: bookView,
    orderBy: { title: 'asc' },
  });

  response.json({ data: books });
});

booksRouter.get('/:id', async (request, response) => {
  const book = await prisma.book.findUnique({ where: { id: String(request.params.id) }, select: bookView });
  if (!book) throw new HttpError(404, 'Livro não encontrado.');
  response.json({ data: book });
});

booksRouter.post('/', ...libraryStaff, validateBody(createBookDto), async (request, response) => {
  const input = request.body as {
    title: string;
    isbn: string;
    publisher?: string;
    publicationYear?: number;
    copies: number;
    categoryId: string;
  };
  const book = await prisma.book.create({
    data: { ...input, availableCopies: input.copies },
    select: bookView,
  });
  response.status(201).json({ data: book });
});

booksRouter.patch('/:id', ...libraryStaff, validateBody(updateBookDto), async (request, response) => {
  const input = request.body as {
    title?: string;
    isbn?: string;
    publisher?: string | null;
    publicationYear?: number | null;
    copies?: number;
    categoryId?: string;
  };
  const existing = await prisma.book.findUnique({ where: { id: String(request.params.id) } });
  if (!existing) throw new HttpError(404, 'Livro não encontrado.');

  const borrowedCopies = existing.copies - existing.availableCopies;
  if (input.copies !== undefined && input.copies < borrowedCopies) {
    throw new HttpError(409, 'O total de exemplares não pode ser menor que a quantidade emprestada.');
  }

  const book = await prisma.book.update({
    where: { id: existing.id },
    data: {
      ...input,
      ...(input.copies !== undefined
        ? { availableCopies: input.copies - borrowedCopies }
        : {}),
    },
    select: bookView,
  });
  response.json({ data: book });
});

booksRouter.delete('/:id', ...libraryStaff, async (request, response) => {
  await prisma.book.delete({ where: { id: String(request.params.id) } });
  response.status(204).end();
});