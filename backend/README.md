# SCEB API

API REST em Node.js, Express, TypeScript e Prisma, servida junto ao frontend Vite pela Vercel. O banco persistente é PostgreSQL no Neon.

## Requisitos

- Node.js 22
- npm (ou pnpm)

## Configuração

No PowerShell, a partir da raiz do repositório, vincule o projeto e baixe as variáveis do Neon:

```powershell
vercel link --yes --scope sceb --project sceb
vercel env pull .env.local --yes
pnpm install --frozen-lockfile
npm --prefix backend ci
```

O desenvolvimento usa as variáveis vinculadas ao projeto Vercel e o banco Neon:

```powershell
vercel dev
```

Para aplicar migrações ou criar o administrador de demonstração, execute os comandos da raiz com o ambiente Vercel:

```powershell
vercel env run -- npm --prefix backend run db:deploy
vercel env run -- npm --prefix backend run db:seed
```

A API local estará em `http://localhost:3000/api`; o Swagger UI fica em `/api/docs` e o health check em `/api/health`.

## Acesso por perfil

- `ALUNO` e `PROFESSOR`: login e consulta autenticada ao catálogo/disponibilidade (`GET /api/books` e `GET /api/books/:id`).
- `BIBLIOTECARIO` e `ADMINISTRADOR`: consulta e cadastro de livros e categorias; gerenciamento de usuários, empréstimos e indicadores conforme as permissões abaixo.
- Todas as rotas de escrita e as rotas de gestão exigem JWT Bearer; alunos e professores recebem `403` ao tentar acessá-las.
- Apenas `ADMINISTRADOR` pode cadastrar, editar ou remover usuários; bibliotecários podem consultar a lista para registrar empréstimos.
- Apenas `ADMINISTRADOR` pode editar ou remover livros, categorias e empréstimos; bibliotecários podem cadastrar livros/categorias e registrar/devolver empréstimos.

O endpoint `POST /api/auth/login` recebe `{ "email": "...", "password": "..." }`. Envie o token recebido no cabeçalho `Authorization: Bearer <token>`.

## Recursos REST

- `GET /api/books?search=...`, `GET /api/books/:id`, `POST /api/books`, `PATCH /api/books/:id`, `DELETE /api/books/:id`
- `GET /api/categories`, `GET /api/categories/:id`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`
- `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`
- `GET /api/loans?status=ACTIVE`, `GET /api/loans/:id`, `POST /api/loans`, `PATCH /api/loans/:id`, `DELETE /api/loans/:id`, `POST /api/loans/:id/return`
- `GET /api/dashboard`

Os DTOs em `src/dto` validam payloads com Zod. O modelo relacional está em `prisma/schema.prisma`; empréstimos preservam o histórico e impedem a exclusão de usuários/livros relacionados. Criação de empréstimo e devolução atualizam a disponibilidade em transações.