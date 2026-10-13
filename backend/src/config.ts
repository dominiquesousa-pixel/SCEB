import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET deve estar definido e ter pelo menos 32 caracteres.');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8443',
};