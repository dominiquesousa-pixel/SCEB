import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { libraryStaff } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(...libraryStaff);

dashboardRouter.get('/', async (_request, response) => {
  const now = new Date();
  const [books, activeLoans, overdueLoans, users, categories] = await Promise.all([
    prisma.book.aggregate({ _sum: { copies: true, availableCopies: true } }),
    prisma.loan.count({ where: { status: 'ACTIVE' } }),
    prisma.loan.count({ where: { status: 'ACTIVE', dueAt: { lt: now } } }),
    prisma.user.count(),
    prisma.category.count(),
  ]);

  response.json({
    data: {
      totalCopies: books._sum.copies ?? 0,
      availableCopies: books._sum.availableCopies ?? 0,
      activeLoans,
      overdueLoans,
      users,
      categories,
    },
  });
});