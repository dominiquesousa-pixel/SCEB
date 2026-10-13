// ── Dados e API ──────────────────────────────────────────
let livros = [];
let emprestimos = [];
let solicitacoes = [];
let usuarios = [];
let categorias = [];
let usuarioAtual = null;

const API_BASE = '/api';
const TOKEN_KEY = 'sceb-token';
const USER_KEY = 'sceb-user';

async function apiRequest(path, options = {}) {
  const headers = { ...options.headers };
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Não foi possível comunicar com a API.');
  return payload?.data;
}

function mapBook(book) {
  return {
    id: book.id,
    titulo: book.title,
    isbn: book.isbn,
    editora: book.publisher || '',
    ano: book.publicationYear || '',
    cat: book.category.name,
    categoryId: book.category.id,
    total: book.copies,
    disp: book.availableCopies,
  };
}

function mapLoan(loan) {
  const overdue = loan.status === 'ACTIVE' && new Date(loan.dueAt) < new Date();
  return {
    id: loan.id,
    livro: loan.book.title,
    user: loan.user.name,
    de: loan.borrowedAt.slice(0, 10),
    ate: loan.dueAt.slice(0, 10),
    st: loan.status === 'RETURNED' ? 'DEVOLVIDO' : overdue ? 'ATRASADO' : 'ATIVO',
  };
}

async function carregarDados() {
  const books = await apiRequest('/books');
  livros = books.map(mapBook);

  if (['BIBLIOTECARIO', 'ADMINISTRADOR'].includes(usuarioAtual.role)) {
    const [users, categories, loans] = await Promise.all([
      apiRequest('/users'),
      apiRequest('/categories'),
      apiRequest('/loans'),
    ]);
    usuarios = users.map(user => ({
      id: user.id,
      nome: user.name,
      email: user.email,
      tipo: user.role,
    }));
    categorias = categories.map(category => ({
      id: category.id,
      nome: category.name,
      desc: category.description || '',
    }));
    emprestimos = loans.map(mapLoan);
  } else {
    usuarios = [];
    categorias = [];
    emprestimos = [];
  }

  solicitacoes = [];
  renderDashboard();
  renderLivros(document.getElementById('livros-srch').value);
  renderEmprestimos();
  renderSolicitacoes();
  renderUsuarios();
  renderCategorias();
}

// ── Utilitários ──────────────────────────────────────────
function badge(label) {
  return `<span class="badge b-${label.toLowerCase()}">${label}</span>`;
}

function avatarBg(tipo) {
  const cores = {
    BIBLIOTECARIO: 'var(--violet-600)',
    ALUNO:         'var(--navy-500)',
    PROFESSOR:     'var(--emerald-600)',
    ADMINISTRADOR: 'var(--rose-600)',
  };
  return cores[tipo] || 'var(--navy-500)';
}

function iniciais(nome) {
  return nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function corBarra(pct) {
  if (pct === 0) return 'var(--rose-500)';
  if (pct < 40)  return 'var(--amber-500)';
  return 'var(--emerald-500)';
}

// ── Navegação ────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.hidden) return;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
  });
});

const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginPasswordToggle = document.getElementById('login-password-toggle');
const loginFeedback = document.getElementById('login-feedback');
const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');

sidebar.inert = true;
main.inert = true;

function hideLoginPassword() {
  loginPassword.type = 'password';
  loginPasswordToggle.setAttribute('aria-label', 'Mostrar senha');
  loginPasswordToggle.title = 'Mostrar senha';
  loginPasswordToggle.setAttribute('aria-pressed', 'false');
}

function configurarPerfil(role) {
  const consultaOnly = ['ALUNO', 'PROFESSOR'].includes(role);
  const paginasRestritas = ['dashboard', 'emprestimos', 'solicitacoes', 'usuarios', 'categorias'];

  document.querySelectorAll('.nav-btn').forEach(button => {
    button.hidden = consultaOnly && paginasRestritas.includes(button.dataset.page);
  });
  paginasRestritas.forEach(page => {
    document.getElementById(`page-${page}`).hidden = consultaOnly;
  });
  ['book-add-btn', 'loan-add-btn', 'usr-add-btn', 'category-add-btn'].forEach(id => {
    document.getElementById(id).hidden = consultaOnly;
  });
  const initialPage = consultaOnly ? 'livros' : 'dashboard';
  document.querySelectorAll('.nav-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.page === initialPage);
  });
  document.querySelectorAll('.page').forEach(page => {
    page.classList.toggle('active', page.id === `page-${initialPage}`);
  });

  document.querySelector('.sb-user .uname').textContent = usuarioAtual.name;
  document.querySelector('.sb-user .urole').textContent = role;
  document.querySelector('.sb-user .avatar').textContent = iniciais(usuarioAtual.name);
}

async function abrirAplicacao(user) {
  usuarioAtual = user;
  await carregarDados();
  configurarPerfil(user.role);
  loginScreen.hidden = true;
  sidebar.inert = false;
  main.inert = false;
}

loginPasswordToggle.addEventListener('click', () => {
  const revealing = loginPassword.type === 'password';
  loginPassword.type = revealing ? 'text' : 'password';
  loginPasswordToggle.setAttribute('aria-label', revealing ? 'Ocultar senha' : 'Mostrar senha');
  loginPasswordToggle.title = revealing ? 'Ocultar senha' : 'Mostrar senha';
  loginPasswordToggle.setAttribute('aria-pressed', String(revealing));
  loginPassword.focus();
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  loginFeedback.textContent = '';
  try {
    const session = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: loginPassword.value }),
    });
    sessionStorage.setItem(TOKEN_KEY, session.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
    await abrirAplicacao(session.user);
  } catch (error) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    loginFeedback.textContent = error.message;
    loginPassword.value = '';
    hideLoginPassword();
    loginPassword.focus();
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  usuarioAtual = null;
  livros = [];
  emprestimos = [];
  usuarios = [];
  categorias = [];
  loginForm.reset();
  hideLoginPassword();
  loginFeedback.textContent = '';
  loginScreen.hidden = false;
  sidebar.inert = true;
  main.inert = true;
  loginEmail.focus();
});

async function restaurarSessao() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return;

  try {
    const user = await apiRequest('/auth/me');
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    await abrirAplicacao(user);
  } catch (error) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    loginFeedback.textContent = error.message;
  }
}

// ── Dashboard ────────────────────────────────────────────
function renderDashboard() {
  document.getElementById('today').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const disponiveis = livros.filter(l => l.disp > 0).length;
  document.getElementById('s-livros').textContent     = livros.length;
  document.getElementById('s-livros-sub').textContent = `${disponiveis} disponíveis`;
  document.getElementById('s-ativos').textContent     = emprestimos.filter(e => e.st === 'ATIVO').length;
  document.getElementById('s-atrasados').textContent  = emprestimos.filter(e => e.st === 'ATRASADO').length;
  document.getElementById('s-pendentes').textContent  = solicitacoes.filter(s => s.st === 'PENDENTE').length;

  document.getElementById('d-emp').innerHTML = emprestimos.slice(0, 4).map(e =>
    `<div class="li">
      <div style="min-width:0">
        <p class="li-t">${escapeHtml(e.livro)}</p>
        <p class="li-s">${escapeHtml(e.user)}</p>
      </div>
      ${badge(e.st)}
    </div>`
  ).join('');

  const pendentes = solicitacoes.filter(s => s.st === 'PENDENTE');
  document.getElementById('d-sol').innerHTML = pendentes.length
    ? pendentes.map(s =>
        `<div class="li">
          <div style="min-width:0">
            <p class="li-t">${escapeHtml(s.livro)}</p>
            <p class="li-s">${escapeHtml(s.user)} · ${escapeHtml(s.data)}</p>
          </div>
          ${badge(s.st)}
        </div>`
      ).join('')
    : `<div class="li" style="justify-content:center;color:var(--navy-400);font-size:13px">
        Nenhuma solicitação pendente
      </div>`;

  document.getElementById('d-bars').innerHTML = livros.map(l => {
    const pct = l.total > 0 ? (l.disp / l.total) * 100 : 0;
    return `<div class="bar-wrap">
      <div class="bar-lbl">
        <span>${escapeHtml(l.titulo)}</span>
        <span>${l.disp}/${l.total}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${corBarra(pct)}"></div>
      </div>
    </div>`;
  }).join('');
}

// ── Livros ───────────────────────────────────────────────
function renderLivros(q) {
  q = (q || '').toLowerCase();
  document.getElementById('livros-count').textContent = `${livros.length} títulos cadastrados`;

  const filtrados = livros.filter(l =>
    l.titulo.toLowerCase().includes(q) ||
    l.isbn.includes(q) ||
    l.cat.toLowerCase().includes(q)
  );

  document.getElementById('livros-tb').innerHTML = filtrados.length
    ? filtrados.map(l => {
        const esgotado = l.disp === 0;
        const dispBadge = esgotado
          ? `<span class="badge b-atrasado">✕ Esgotado</span>`
          : `<span class="badge b-ativo">✓ ${l.disp}</span>`;
        return `<tr>
          <td><p class="td-t">${escapeHtml(l.titulo)}</p><p class="td-s">${l.ano}</p></td>
          <td class="td-m">${escapeHtml(l.cat)}</td>
          <td class="td-mo">${escapeHtml(l.isbn)}</td>
          <td class="td-m">${escapeHtml(l.editora)}</td>
          <td style="text-align:center">${dispBadge}</td>
        </tr>`;
      }).join('')
    : `<tr class="empty"><td colspan="5">Nenhum livro encontrado</td></tr>`;
}

document.getElementById('livros-srch').addEventListener('input', e => renderLivros(e.target.value));

// ── Empréstimos ──────────────────────────────────────────
let empFilter = 'TODOS';

function renderEmprestimos() {
  document.getElementById('emp-count').textContent = `${emprestimos.length} registros`;

  const statusList = ['TODOS', 'ATIVO', 'ATRASADO', 'DEVOLVIDO'];
  document.getElementById('emp-ftabs').innerHTML = statusList.map(s =>
    `<button class="ftab${empFilter === s ? ' active' : ''}" data-st="${s}">${s}</button>`
  ).join('');

  document.querySelectorAll('#emp-ftabs .ftab').forEach(b => {
    b.addEventListener('click', () => {
      empFilter = b.dataset.st;
      renderEmprestimos();
    });
  });

  const filtrados = empFilter === 'TODOS'
    ? emprestimos
    : emprestimos.filter(e => e.st === empFilter);

  document.getElementById('emp-tb').innerHTML = filtrados.length
    ? filtrados.map(e => {
        const corData = e.st === 'ATRASADO' ? 'color:var(--rose-600)' : '';
        return `<tr>
          <td class="td-id">#${String(e.id).padStart(3, '0')}</td>
          <td class="td-t">${escapeHtml(e.livro)}</td>
          <td class="td-m">${escapeHtml(e.user)}</td>
          <td class="td-mo">${escapeHtml(e.de)}</td>
          <td class="td-mo" style="${corData}">${escapeHtml(e.ate)}</td>
          <td>${badge(e.st)}</td>
          <td>${e.st === 'DEVOLVIDO' ? '' : `<button class="btn-o" type="button" data-return-loan="${escapeHtml(e.id)}">Registrar devolução</button>`}</td>
        </tr>`;
      }).join('')
    : `<tr class="empty"><td colspan="7">Nenhum empréstimo nesta categoria</td></tr>`;

  document.querySelectorAll('[data-return-loan]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await apiRequest(`/loans/${button.dataset.returnLoan}/return`, { method: 'POST' });
        await carregarDados();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

// ── Solicitações ─────────────────────────────────────────
function renderSolicitacoes() {
  document.getElementById('sol-count').textContent =
    `${solicitacoes.filter(s => s.st === 'PENDENTE').length} aguardando aprovação`;

  if (solicitacoes.length === 0) {
    document.getElementById('sol-list').innerHTML =
      '<div class="li" style="justify-content:center;color:var(--navy-400);font-size:13px">Nenhuma solicitação registrada</div>';
    return;
  }

  document.getElementById('sol-list').innerHTML = solicitacoes.map(s => {
    const acoes = s.st === 'PENDENTE'
      ? `<button class="btn btn-g" onclick="setSol(${s.id},'APROVADA')">✓ Aprovar</button>
         <button class="btn btn-r" onclick="setSol(${s.id},'REPROVADA')">✕ Reprovar</button>
         <button class="btn-o"    onclick="setSol(${s.id},'CANCELADA')">Cancelar</button>`
      : '';

    return `<div class="sol-card">
      <div>
        <p style="font-weight:600;color:var(--navy-900);font-size:14px">${s.livro}</p>
        <p style="font-size:13px;color:var(--navy-600);margin-top:4px">
          Solicitado por <strong>${s.user}</strong>
        </p>
        <p style="font-size:11px;color:var(--navy-400);font-family:var(--font-m);margin-top:4px">
          ${s.data}
        </p>
      </div>
      <div class="sol-acts">${badge(s.st)}${acoes}</div>
    </div>`;
  }).join('');
}

// ── Usuários ─────────────────────────────────────────────
function renderUsuarios() {
  document.getElementById('usr-count').textContent = `${usuarios.length} usuários cadastrados`;

  document.getElementById('usr-grid').innerHTML = usuarios.map(u =>
    `<div class="ucard">
      <div class="avatar-lg" style="background:${avatarBg(u.tipo)}">${escapeHtml(iniciais(u.nome))}</div>
      <div style="min-width:0">
        <p class="uname">${escapeHtml(u.nome)}</p>
        <p class="uemail">${escapeHtml(u.email)}</p>
        ${badge(u.tipo)}
      </div>
    </div>`
  ).join('');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

const usrDialog = document.getElementById('usr-dialog');
const usrForm = document.getElementById('usr-form');
const usrName = document.getElementById('usr-name');
const usrEmail = document.getElementById('usr-email');
const usrPassword = document.getElementById('usr-password');
const usrPasswordToggle = document.getElementById('usr-password-toggle');
const usrType = usrForm.elements.tipo;
const usrMasterGroup = document.getElementById('usr-master-group');
const usrMasterPassword = document.getElementById('usr-master-password');
const usrRecoveryDialog = document.getElementById('usr-recovery-dialog');
const usrRecoveryForm = document.getElementById('usr-recovery-form');
const usrRecoveryEmail = document.getElementById('usr-recovery-email');
const usrRecoveryMessage = document.getElementById('usr-recovery-message');
function hideUserPassword() {
  usrPassword.type = 'password';
  usrPasswordToggle.setAttribute('aria-label', 'Mostrar senha');
  usrPasswordToggle.title = 'Mostrar senha';
  usrPasswordToggle.setAttribute('aria-pressed', 'false');
}

usrPasswordToggle.addEventListener('click', () => {
  const revealing = usrPassword.type === 'password';
  usrPassword.type = revealing ? 'text' : 'password';
  usrPasswordToggle.setAttribute('aria-label', revealing ? 'Ocultar senha' : 'Mostrar senha');
  usrPasswordToggle.title = revealing ? 'Ocultar senha' : 'Mostrar senha';
  usrPasswordToggle.setAttribute('aria-pressed', String(revealing));
  usrPassword.focus();
});

function updateMasterField() {
  usrMasterGroup.hidden = true;
  usrMasterPassword.required = false;
  usrMasterPassword.value = '';
  usrMasterPassword.setCustomValidity('');
}

document.getElementById('usr-add-btn').addEventListener('click', () => {
  usrForm.reset();
  hideUserPassword();
  updateMasterField();
  usrDialog.showModal();
});
document.getElementById('usr-cancel-btn').addEventListener('click', () => usrDialog.close());
usrType.addEventListener('change', updateMasterField);
usrName.addEventListener('input', () => usrName.setCustomValidity(''));
usrEmail.addEventListener('input', () => usrEmail.setCustomValidity(''));
usrMasterPassword.addEventListener('input', () => usrMasterPassword.setCustomValidity(''));

document.getElementById('usr-recover-open').addEventListener('click', () => {
  usrRecoveryForm.reset();
  usrRecoveryMessage.textContent = '';
  usrRecoveryDialog.showModal();
});
document.getElementById('usr-recovery-cancel').addEventListener('click', () => usrRecoveryDialog.close());

usrRecoveryForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = usrRecoveryEmail.value.trim().toLowerCase();
  const isRegistered = usuarios.some(usuario => usuario.email.toLowerCase() === email);
  usrRecoveryMessage.textContent = isRegistered
    ? `Demonstração: as instruções seriam enviadas para ${usrRecoveryEmail.value.trim()}. Nenhum e-mail foi enviado.`
    : 'Não há usuário cadastrado com esse e-mail.';
});

usrForm.addEventListener('submit', async event => {
  event.preventDefault();

  const nome = usrName.value.trim();
  const email = usrEmail.value.trim();
  const tipo = usrType.value;
  usrName.setCustomValidity(nome ? '' : 'Informe o nome completo.');
  usrEmail.setCustomValidity(
    usuarios.some(usuario => usuario.email.toLowerCase() === email.toLowerCase())
      ? 'Este e-mail já está cadastrado.'
      : ''
  );
  if (!usrForm.reportValidity()) return;

  try {
    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({ name: nome, email, password: usrPassword.value, role: tipo }),
    });
    await carregarDados();
  } catch (error) {
    usrEmail.setCustomValidity(error.message);
    usrEmail.reportValidity();
    return;
  }

  usrForm.reset();
  hideUserPassword();
  updateMasterField();
  usrDialog.close();

});

// ── Categorias ───────────────────────────────────────────
function renderCategorias() {
  document.getElementById('cat-count').textContent = `${categorias.length} categorias`;

  document.getElementById('cat-grid').innerHTML = categorias.map(c =>
    `<div class="ccard">
      <div class="cico">🏷️</div>
      <div>
        <p class="cname">${escapeHtml(c.nome)}</p>
        <p class="cdesc">${escapeHtml(c.desc)}</p>
      </div>
    </div>`
  ).join('');
}

const bookDialog = document.getElementById('book-dialog');
const bookForm = document.getElementById('book-form');
const bookCategory = document.getElementById('book-category');
const bookIsbn = document.getElementById('book-isbn');

function populateBookCategories() {
  bookCategory.innerHTML = '<option value="">Selecione uma categoria</option>' +
    categorias.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join('');
}

document.getElementById('book-add-btn').addEventListener('click', () => {
  bookForm.reset();
  bookIsbn.setCustomValidity('');
  populateBookCategories();
  bookDialog.showModal();
});
document.getElementById('book-cancel-btn').addEventListener('click', () => bookDialog.close());
bookIsbn.addEventListener('input', () => bookIsbn.setCustomValidity(''));

bookForm.addEventListener('submit', async event => {
  event.preventDefault();
  const isbn = bookIsbn.value.trim();
  bookIsbn.setCustomValidity(
    livros.some(livro => livro.isbn.toLowerCase() === isbn.toLowerCase())
      ? 'Este ISBN já está cadastrado.'
      : ''
  );
  if (!bookForm.reportValidity()) return;

  try {
    await apiRequest('/books', {
      method: 'POST',
      body: JSON.stringify({
        title: document.getElementById('book-title').value.trim(),
        categoryId: bookCategory.value,
        isbn,
        publisher: document.getElementById('book-publisher').value.trim(),
        publicationYear: Number(document.getElementById('book-year').value),
        copies: Number(document.getElementById('book-copies').value),
      }),
    });
    await carregarDados();
  } catch (error) {
    bookIsbn.setCustomValidity(error.message);
    bookIsbn.reportValidity();
    return;
  }

  bookForm.reset();
  bookDialog.close();
});

const loanDialog = document.getElementById('loan-dialog');
const loanForm = document.getElementById('loan-form');
const loanBook = document.getElementById('loan-book');
const loanUser = document.getElementById('loan-user');
const loanDate = document.getElementById('loan-date');
const loanDueDate = document.getElementById('loan-due-date');
const loanSubmit = document.getElementById('loan-submit-btn');

function toLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function populateLoanOptions() {
  const disponiveis = livros.filter(livro => livro.disp > 0);
  loanBook.innerHTML = disponiveis.length
    ? '<option value="">Selecione um livro</option>' + disponiveis.map(livro =>
        `<option value="${livro.id}">${escapeHtml(livro.titulo)} (${livro.disp} disponível(is))</option>`
      ).join('')
    : '<option value="">Nenhum livro disponível</option>';
  loanUser.innerHTML = '<option value="">Selecione um usuário</option>' + usuarios.map(usuario =>
    `<option value="${usuario.id}">${escapeHtml(usuario.nome)}</option>`
  ).join('');
  loanSubmit.disabled = disponiveis.length === 0;
}

document.getElementById('loan-add-btn').addEventListener('click', () => {
  loanForm.reset();
  populateLoanOptions();
  const hoje = new Date();
  const devolucao = new Date(hoje);
  devolucao.setDate(devolucao.getDate() + 14);
  loanDate.value = toLocalDate(hoje);
  loanDueDate.value = toLocalDate(devolucao);
  loanDueDate.min = loanDate.value;
  loanDialog.showModal();
});
document.getElementById('loan-cancel-btn').addEventListener('click', () => loanDialog.close());
loanDate.addEventListener('change', () => {
  loanDueDate.min = loanDate.value;
  if (loanDueDate.value < loanDate.value) loanDueDate.value = loanDate.value;
});

loanForm.addEventListener('submit', async event => {
  event.preventDefault();
  const livro = livros.find(item => item.id === loanBook.value);
  const usuario = usuarios.find(item => item.id === loanUser.value);
  if (!livro || !usuario || livro.disp < 1 || !loanForm.reportValidity()) return;

  try {
    await apiRequest('/loans', {
      method: 'POST',
      body: JSON.stringify({
        bookId: livro.id,
        userId: usuario.id,
        dueAt: new Date(`${loanDueDate.value}T23:59:59`).toISOString(),
      }),
    });
    await carregarDados();
  } catch (error) {
    window.alert(error.message);
    return;
  }

  loanForm.reset();
  loanDialog.close();
});

const categoryDialog = document.getElementById('category-dialog');
const categoryForm = document.getElementById('category-form');
const categoryName = document.getElementById('category-name');

document.getElementById('category-add-btn').addEventListener('click', () => {
  categoryForm.reset();
  categoryName.setCustomValidity('');
  categoryDialog.showModal();
});
document.getElementById('category-cancel-btn').addEventListener('click', () => categoryDialog.close());
categoryName.addEventListener('input', () => categoryName.setCustomValidity(''));

categoryForm.addEventListener('submit', async event => {
  event.preventDefault();
  const nome = categoryName.value.trim();
  categoryName.setCustomValidity(
    categorias.some(categoria => categoria.nome.toLowerCase() === nome.toLowerCase())
      ? 'Esta categoria já existe.'
      : ''
  );
  if (!categoryForm.reportValidity()) return;

  try {
    await apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: nome,
        description: document.getElementById('category-description').value.trim(),
      }),
    });
    await carregarDados();
  } catch (error) {
    categoryName.setCustomValidity(error.message);
    categoryName.reportValidity();
    return;
  }

  categoryForm.reset();
  categoryDialog.close();
});

// ── Inicialização ────────────────────────────────────────
restaurarSessao();
