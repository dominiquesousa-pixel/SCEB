# SCEB API

API REST em Node.js, Express, TypeScript e Prisma, integrada ao frontend Vite e a PostgreSQL.

## Vercel

O projeto Vercel `sceb` utiliza a integração Neon e publica frontend e API no mesmo domínio. As variáveis `DATABASE_URL` e `DATABASE_URL_UNPOOLED` são fornecidas pela integração; `JWT_SECRET` deve ser configurada como segredo na Vercel.

Confira a API em `https://sceb.vercel.app/api/health` e a documentação em `https://sceb.vercel.app/api/docs`. Novas alterações são implantadas pela Vercel após o envio para a branch de produção conectada.

Para aplicar migrações ou criar o administrador inicial, vincule o projeto com a CLI da Vercel e execute na raiz do repositório:

```powershell
vercel link
vercel env run -- npm --prefix backend run db:deploy
vercel env run -- npm --prefix backend run db:seed
```

O seed requer `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (exatamente 8 caracteres); `SEED_ADMIN_NAME` é opcional. O seed não redefine senhas existentes.

## Publicar no Render

1. Envie este repositório para o GitHub e, no Render, escolha **New > Blueprint** para conectar o repositório.
2. O Render usará `render.yaml` para criar o serviço web `sceb` e o PostgreSQL `sceb-db`. Confirme a criação dos recursos.
3. O build instala as dependências do frontend e da API. No início de cada implantação, `prisma migrate deploy` aplica as migrações antes de iniciar o servidor.
4. Abra a URL do serviço web. O frontend e a API usam a mesma origem; a API fica em `/api`, a documentação em `/api/docs` e o health check em `/api/health`.

O Blueprint gera `JWT_SECRET` e injeta a URL do banco em `DATABASE_URL` e `DATABASE_URL_UNPOOLED`. Não substitua essas variáveis por credenciais no código. A API usa a URL pública do serviço Render para CORS; se usar um domínio próprio ou outro frontend, configure `CORS_ORIGIN` nas variáveis do serviço.

> O plano gratuito do PostgreSQL no Render expira após 30 dias; depois do período de recuperação, o Render exclui o banco e os dados. Para manter os dados, faça upgrade do banco para um plano pago antes da expiração.

### Criar o administrador inicial

O banco começa sem usuários. Configure `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` nas variáveis do serviço no Render; a senha deve ter exatamente 8 caracteres. Depois que o banco estiver disponível, execute uma única vez, no Shell do serviço:

```bash
npm --prefix backend run db:seed
```

Remova `SEED_ADMIN_PASSWORD` das variáveis do serviço depois de criar o usuário. O seed não redefine a senha de uma conta já existente.

## Desenvolvimento local

Requisitos: Node.js 22, npm e um PostgreSQL acessível.

Crie `backend/.env` com as variáveis abaixo e preencha as URLs e segredos locais:

```dotenv
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST/DATABASE"
JWT_SECRET="uma-chave-aleatoria-com-pelo-menos-32-caracteres"
CORS_ORIGIN="http://localhost:8443"
```

Instale dependências e aplique as migrações:

```powershell
npm ci
npm --prefix backend ci
npm --prefix backend run db:deploy
npm run dev
```

O frontend fica em `http://localhost:8443`; o Vite encaminha `/api` para a API local na porta `3000`.

## Recursos REST

- `POST /api/auth/login` recebe `{ "email": "...", "password": "..." }`. Envie o token recebido como `Authorization: Bearer <token>`.
- Livros: `GET /api/books?search=...`, `GET /api/books/:id`, `POST /api/books`, `PATCH /api/books/:id`, `DELETE /api/books/:id`.
- Categorias: `GET /api/categories`, `GET /api/categories/:id`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`.
- Usuários: `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`.
- Empréstimos: `GET /api/loans?status=ACTIVE`, `GET /api/loans/:id`, `POST /api/loans`, `PATCH /api/loans/:id`, `DELETE /api/loans/:id`, `POST /api/loans/:id/return`.
- Indicadores: `GET /api/dashboard`.

Os DTOs em `src/dto` validam payloads com Zod. As permissões são baseadas no perfil e as operações de empréstimo/devolução atualizam a disponibilidade em transações.
