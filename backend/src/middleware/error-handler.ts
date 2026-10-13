import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Dados inválidos.', details: error.flatten() });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      response.status(409).json({ error: 'Já existe um registro com esse valor único.' });
      return;
    }
    if (error.code === 'P2025') {
      response.status(404).json({ error: 'Registro não encontrado.' });
      return;
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      response.status(409).json({ error: 'O registro está relacionado a outros dados e não pode ser removido.' });
      return;
    }
  }

  console.error(error);
  response.status(500).json({ error: 'Erro interno do servidor.' });
};