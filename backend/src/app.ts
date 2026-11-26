import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { openApiDocument } from './openapi.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.routes.js';
import { booksRouter } from './routes/books.routes.js';
import { categoriesRouter } from './routes/categories.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { loansRouter } from './routes/loans.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';

const app = express();

app.use(cors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_request, response) => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		response.json({ data: { status: 'ok' } });
	} catch (error) {
		console.error('Health check failed', error);
		response.status(503).json({ error: 'Serviço indisponível.' });
	}
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);

const frontendDirectory = resolve(process.cwd(), '../dist');
app.use(express.static(frontendDirectory));
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path === '/api' || request.path.startsWith('/api/')) {
    next();
    return;
  }

  response.sendFile(resolve(frontendDirectory, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((_request, response) => response.status(404).json({ error: 'Rota não encontrada.' }));
app.use(errorHandler);

export default app;