import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { config } from '../config.js';

const validRoles: UserRole[] = ['ALUNO', 'PROFESSOR', 'BIBLIOTECARIO', 'ADMINISTRADOR'];

export const authenticate: RequestHandler = (request, response, next) => {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;

  if (!token) {
    response.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const userId = payload.sub;
    const role = payload.role as UserRole;

    if (typeof userId !== 'string' || !validRoles.includes(role)) {
      response.status(401).json({ error: 'Token inválido.' });
      return;
    }

    request.auth = { userId, role };
    next();
  } catch {
    response.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

export function authorizeRoles(...roles: UserRole[]): RequestHandler {
  return (request, response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      response.status(403).json({ error: 'Você não tem permissão para esta operação.' });
      return;
    }

    next();
  };
}

export const libraryStaff = [authenticate, authorizeRoles('BIBLIOTECARIO', 'ADMINISTRADOR')];