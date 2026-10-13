import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { libraryStaff } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createCategoryDto, updateCategoryDto } from '../dto/category.dto.js';
import { HttpError } from '../utils/http-error.js';

export const categoriesRouter = Router();
categoriesRouter.use(...libraryStaff);

categoriesRouter.get('/', async (_request, response) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { books: true } } },
    orderBy: { name: 'asc' },
  });
  response.json({ data: categories });
});

categoriesRouter.get('/:id', async (request, response) => {
  const category = await prisma.category.findUnique({
    where: { id: String(request.params.id) },
    include: { _count: { select: { books: true } } },
  });
  if (!category) throw new HttpError(404, 'Categoria não encontrada.');
  response.json({ data: category });
});

categoriesRouter.post('/', validateBody(createCategoryDto), async (request, response) => {
  const category = await prisma.category.create({ data: request.body });
  response.status(201).json({ data: category });
});

categoriesRouter.patch('/:id', validateBody(updateCategoryDto), async (request, response) => {
  const category = await prisma.category.update({
    where: { id: String(request.params.id) },
    data: request.body,
  });
  response.json({ data: category });
});

categoriesRouter.delete('/:id', async (request, response) => {
  await prisma.category.delete({ where: { id: String(request.params.id) } });
  response.status(204).end();
});