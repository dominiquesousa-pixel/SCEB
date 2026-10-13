import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { openApiDocument } from './openapi.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.routes.js';
import { booksRouter } from './routes/books.routes.js';
import { categoriesRouter } from './routes/categories.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { loansRouter } from './routes/loans.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';

export const app = express();

app.use(cors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => response.json({ data: { status: 'ok' } }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);

app.use((_request, response) => response.status(404).json({ error: 'Rota não encontrada.' }));
app.use(errorHandler);