export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SCEB API',
    version: '1.0.0',
    description: 'API REST do Sistema de Controle de Empréstimos da Biblioteca.',
  },
  servers: [{ url: '/api', description: 'API local' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      UserRole: { type: 'string', enum: ['ALUNO', 'PROFESSOR', 'BIBLIOTECARIO', 'ADMINISTRADOR'] },
      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      BookInput: {
        type: 'object',
        required: ['title', 'isbn', 'copies', 'categoryId'],
        properties: {
          title: { type: 'string' },
          isbn: { type: 'string' },
          publisher: { type: 'string' },
          publicationYear: { type: 'integer' },
          copies: { type: 'integer', minimum: 1 },
          categoryId: { type: 'string' },
        },
      },
      BookUpdate: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          isbn: { type: 'string' },
          publisher: { type: 'string', nullable: true },
          publicationYear: { type: 'integer', nullable: true },
          copies: { type: 'integer', minimum: 1 },
          categoryId: { type: 'string' },
        },
      },
      UserInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password', minLength: 8 },
          role: { $ref: '#/components/schemas/UserRole' },
        },
      },
      UserUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password', minLength: 8 },
          role: { $ref: '#/components/schemas/UserRole' },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' }, description: { type: 'string' } },
      },
      CategoryUpdate: {
        type: 'object',
        properties: { name: { type: 'string' }, description: { type: 'string' } },
      },
      LoanInput: {
        type: 'object',
        required: ['userId', 'bookId', 'dueAt'],
        properties: {
          userId: { type: 'string' },
          bookId: { type: 'string' },
          dueAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': { get: { summary: 'Verifica disponibilidade da API', responses: { '200': { description: 'API ativa' } } } },
    '/auth/login': {
      post: {
        summary: 'Autentica usuário e retorna JWT',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } },
        responses: { '200': { description: 'Sessão autenticada' }, '401': { description: 'Credenciais inválidas' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Retorna o usuário da sessão autenticada',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Usuário da sessão' }, '401': { description: 'Sessão inválida' } },
      },
    },
    '/books': {
      get: {
        summary: 'Lista acervo e disponibilidade (todos os perfis autenticados)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'Acervo' }, '401': { description: 'Não autenticado' } },
      },
      post: {
        summary: 'Cadastra livro (bibliotecário/administrador)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BookInput' } } } },
        responses: { '201': { description: 'Livro criado' }, '403': { description: 'Acesso negado' } },
      },
    },
    '/books/{id}': {
      get: { summary: 'Consulta livro e disponibilidade', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Livro' }, '404': { description: 'Não encontrado' } } },
      patch: { summary: 'Atualiza livro (bibliotecário/administrador)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BookUpdate' } } } }, responses: { '200': { description: 'Livro atualizado' }, '403': { description: 'Acesso negado' } } },
      delete: { summary: 'Remove livro sem empréstimos associados', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Livro removido' }, '409': { description: 'Livro relacionado a empréstimos' } } },
    },
    '/categories': {
      get: { summary: 'Lista categorias (bibliotecário/administrador)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Categorias' }, '403': { description: 'Acesso negado' } } },
      post: { summary: 'Cria categoria', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } } } }, responses: { '201': { description: 'Categoria criada' } } },
    },
    '/categories/{id}': {
      get: { summary: 'Consulta categoria', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Categoria' }, '404': { description: 'Não encontrada' } } },
      patch: { summary: 'Atualiza categoria', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryUpdate' } } } }, responses: { '200': { description: 'Categoria atualizada' } } },
      delete: { summary: 'Remove categoria sem livros associados', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Categoria removida' }, '409': { description: 'Categoria possui livros' } } },
    },
    '/users': {
      get: { summary: 'Lista usuários (bibliotecário/administrador)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Usuários sem dados de senha' } } },
      post: { summary: 'Cadastra usuário', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserInput' } } } }, responses: { '201': { description: 'Usuário criado' } } },
    },
    '/users/{id}': {
      get: { summary: 'Consulta usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Usuário' }, '404': { description: 'Não encontrado' } } },
      patch: { summary: 'Atualiza usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserUpdate' } } } }, responses: { '200': { description: 'Usuário atualizado' } } },
      delete: { summary: 'Remove usuário sem empréstimos associados', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Usuário removido' }, '409': { description: 'Usuário possui empréstimos' } } },
    },
    '/loans': {
      get: { summary: 'Lista empréstimos (bibliotecário/administrador)', security: [{ bearerAuth: [] }], parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'RETURNED'] } }], responses: { '200': { description: 'Empréstimos' } } },
      post: { summary: 'Registra empréstimo e atualiza disponibilidade', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoanInput' } } } }, responses: { '201': { description: 'Empréstimo criado' }, '409': { description: 'Sem exemplares disponíveis' } } },
    },
    '/loans/{id}': {
      get: { summary: 'Consulta empréstimo', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Empréstimo' }, '404': { description: 'Não encontrado' } } },
    },
    '/loans/{id}/return': {
      post: { summary: 'Registra devolução e repõe disponibilidade', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Devolução registrada' }, '409': { description: 'Já devolvido' } } },
    },
    '/dashboard': {
      get: { summary: 'Indicadores da biblioteca (bibliotecário/administrador)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Indicadores' }, '403': { description: 'Acesso negado' } } },
    },
  },
};