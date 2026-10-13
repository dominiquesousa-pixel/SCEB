# SCEB API

API REST em Node.js, Express, TypeScript e Prisma. O banco padrão é SQLite para desenvolvimento local; a configuração do Prisma pode ser adaptada para PostgreSQL em implantação.

## Requisitos

- Node.js 22
- npm (ou pnpm)

## Configuração

No PowerShell, dentro desta pasta:

```powershell
Copy-Item .env.example .env
npm install
```

Edite `.env` e defina uma senha segura para o administrador de demonstração e um `JWT_SECRET` aleatório com pelo menos 32 caracteres. Depois inicialize o banco:

```powershell
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

A API estará em `http://localhost:3000/api`; o Swagger UI fica em `/api/docs` e o health check em `/api/health`.

## Acesso por perfil

- `ALUNO` e `PROFESSOR`: login e consulta autenticada ao catálogo/disponibilidade (`GET /api/books` e `GET /api/books/:id`).
- `BIBLIOTECARIO` e `ADMINISTRADOR`: gerenciamento de livros, categorias, usuários, empréstimos e indicadores.
- Todas as rotas de escrita e as rotas de gestão exigem JWT Bearer; alunos e professores recebem `403` ao tentar acessá-las.

O endpoint `POST /api/auth/login` recebe `{ "email": "...", "password": "..." }`. Envie o token recebido no cabeçalho `Authorization: Bearer <token>`.

## Recursos REST

- `GET /api/books?search=...`, `GET /api/books/:id`, `POST /api/books`, `PATCH /api/books/:id`, `DELETE /api/books/:id`
- `GET /api/categories`, `GET /api/categories/:id`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`
- `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`
- `GET /api/loans?status=ACTIVE`, `GET /api/loans/:id`, `POST /api/loans`, `POST /api/loans/:id/return`
- `GET /api/dashboard`

Os DTOs em `src/dto` validam payloads com Zod. O modelo relacional está em `prisma/schema.prisma`; empréstimos preservam o histórico e impedem a exclusão de usuários/livros relacionados. Criação de empréstimo e devolução atualizam a disponibilidade em transações.