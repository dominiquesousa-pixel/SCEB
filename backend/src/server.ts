import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(config.port, () => {
  console.log(`SCEB API disponível em http://localhost:${config.port}/api`);
  console.log(`Documentação Swagger em http://localhost:${config.port}/api/docs`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);