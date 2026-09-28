// ── Dados ────────────────────────────────────────────────
let livros = [
  { id: 1, titulo: 'Dom Casmurro',            isbn: '978-85-359-0277-1', editora: 'Ática',         ano: 1997, cat: 'Literatura Brasileira',     total: 5, disp: 3 },
  { id: 2, titulo: 'Cálculo Vol. 1',           isbn: '978-85-221-0498-6', editora: 'LTC',            ano: 2011, cat: 'Ciências Exatas',            total: 8, disp: 2 },
  { id: 3, titulo: 'Clean Code',               isbn: '978-0-13-235088-4', editora: 'Prentice Hall',  ano: 2008, cat: 'Tecnologia da Informação',   total: 4, disp: 4 },
  { id: 4, titulo: 'Sociologia Contemporânea', isbn: '978-85-7522-493-2', editora: 'Saraiva',        ano: 2015, cat: 'Ciências Humanas',           total: 3, disp: 0 },
  { id: 5, titulo: 'O Cortiço',                isbn: '978-85-359-0181-1', editora: 'Ática',          ano: 1999, cat: 'Literatura Brasileira',      total: 6, disp: 5 },
  { id: 6, titulo: 'Direito Constitucional',   isbn: '978-85-392-0082-5', editora: 'Método',         ano: 2020, cat: 'Direito',                    total: 7, disp: 1 },
  { id: 7, titulo: 'Design Patterns',          isbn: '978-0-20-163361-5', editora: 'Addison-Wesley', ano: 1994, cat: 'Tecnologia da Informação',   total: 3, disp: 3 },
];

let emprestimos = [
  { id: 1, livro: 'Dom Casmurro',            user: 'Lucas Henrique Souza',      de: '2026-09-01', ate: '2026-09-15', st: 'ATRASADO'  },
  { id: 2, livro: 'Cálculo Vol. 1',           user: 'Profª. Mariana Figueiredo', de: '2026-09-10', ate: '2026-09-24', st: 'ATIVO'     },
  { id: 3, livro: 'Sociologia Contemporânea', user: 'Rafael Andrade Lima',       de: '2026-09-05', ate: '2026-09-19', st: 'DEVOLVIDO' },
  { id: 4, livro: 'Direito Constitucional',   user: 'Dr. Carlos Menezes',        de: '2026-09-12', ate: '2026-09-26', st: 'ATIVO'     },
  { id: 5, livro: 'Clean Code',               user: 'Lucas Henrique Souza',      de: '2026-08-20', ate: '2026-09-03', st: 'ATRASADO'  },
];

let solicitacoes = [
  { id: 1, livro: 'Cálculo Vol. 1',  user: 'Rafael Andrade Lima',       data: '2026-09-23', st: 'PENDENTE'  },
  { id: 2, livro: 'Dom Casmurro',    user: 'Dr. Carlos Menezes',        data: '2026-09-22', st: 'PENDENTE'  },
  { id: 3, livro: 'Design Patterns', user: 'Profª. Mariana Figueiredo', data: '2026-09-20', st: 'APROVADA'  },
  { id: 4, livro: 'O Cortiço',       user: 'Lucas Henrique Souza',      data: '2026-09-18', st: 'REPROVADA' },
];

let usuarios = [
  { id: 1, nome: 'Ana Beatriz Carvalho',      email: 'ana.carvalho@biblioteca.edu.br', tipo: 'BIBLIOTECARIO'  },
  { id: 2, nome: 'Lucas Henrique Souza',      email: 'lucas.souza@aluno.edu.br',       tipo: 'ALUNO'          },
  { id: 3, nome: 'Profª. Mariana Figueiredo', email: 'm.figueiredo@docente.edu.br',    tipo: 'PROFESSOR'      },
  { id: 4, nome: 'Rafael Andrade Lima',       email: 'r.andrade@aluno.edu.br',         tipo: 'ALUNO'          },
  { id: 5, nome: 'Dr. Carlos Menezes',        email: 'c.menezes@docente.edu.br',       tipo: 'PROFESSOR'      },
  { id: 6, nome: 'Admin Sistema',             email: 'admin@biblioteca.edu.br',        tipo: 'ADMINISTRADOR', senha: 'admin123' },
];

let categorias = [
  { id: 1, nome: 'Literatura Brasileira',    desc: 'Obras literárias de autores nacionais'          },
  { id: 2, nome: 'Ciências Exatas',          desc: 'Matemática, física, química e correlatos'       },
  { id: 3, nome: 'Ciências Humanas',         desc: 'Filosofia, sociologia, história e correlatos'   },
  { id: 4, nome: 'Tecnologia da Informação', desc: 'Computação, programação e sistemas'             },
  { id: 5, nome: 'Direito',                  desc: 'Legislação, jurisprudência e doutrina jurídica' },
];

const STORE_KEY = 'sceb-store-v1';

function loadStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return;

    if (Array.isArray(stored.livros)) livros = stored.livros;
    if (Array.isArray(stored.emprestimos)) emprestimos = stored.emprestimos;
    if (Array.isArray(stored.solicitacoes)) solicitacoes = stored.solicitacoes;
    if (Array.isArray(stored.usuarios)) usuarios = stored.usuarios;
    if (Array.isArray(stored.categorias)) categorias = stored.categorias;
  } catch {
    // Retain the built-in demonstration data when storage is unavailable or invalid.
  }
}

function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      livros,
      emprestimos,
      solicitacoes,
      usuarios,
      categorias,
    }));
  } catch (error) {
    console.error('Não foi possível salvar os dados deste navegador.', error);
  }
}

loadStore();

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
const loginRecoveryDialog = document.getElementById('login-recovery-dialog');
const loginRecoveryForm = document.getElementById('login-recovery-form');
const loginRecoveryEmail = document.getElementById('login-recovery-email');
const loginRecoveryPassword = document.getElementById('login-recovery-password');
const loginRecoveryConfirm = document.getElementById('login-recovery-confirm');
const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');
let registeringFromLogin = false;

sidebar.inert = true;
main.inert = true;

function hideLoginPassword() {
  loginPassword.type = 'password';
  loginPasswordToggle.setAttribute('aria-label', 'Mostrar senha');
  loginPasswordToggle.title = 'Mostrar senha';
  loginPasswordToggle.setAttribute('aria-pressed', 'false');
}

loginPasswordToggle.addEventListener('click', () => {
  const revealing = loginPassword.type === 'password';
  loginPassword.type = revealing ? 'text' : 'password';
  loginPasswordToggle.setAttribute('aria-label', revealing ? 'Ocultar senha' : 'Mostrar senha');
  loginPasswordToggle.title = revealing ? 'Ocultar senha' : 'Mostrar senha';
  loginPasswordToggle.setAttribute('aria-pressed', String(revealing));
  loginPassword.focus();
});

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const senha = loginPassword.value;
  const usuario = usuarios.find(conta => conta.email.toLowerCase() === email && conta.senha === senha);

  if (!usuario) {
    loginFeedback.textContent = 'E-mail ou senha inválidos.';
    loginPassword.value = '';
    hideLoginPassword();
    loginPassword.focus();
    return;
  }

  loginFeedback.textContent = '';
  loginScreen.hidden = true;
  sidebar.inert = false;
  main.inert = false;
});

document.getElementById('logout-btn').addEventListener('click', () => {
  loginForm.reset();
  hideLoginPassword();
  loginFeedback.textContent = '';
  loginScreen.hidden = false;
  sidebar.inert = true;
  main.inert = true;
  loginEmail.focus();
});

document.getElementById('login-register-btn').addEventListener('click', () => {
  registeringFromLogin = true;
  usrForm.reset();
  hideUserPassword();
  updateMasterField();
  usrDialog.showModal();
});

document.getElementById('login-forgot-btn').addEventListener('click', () => {
  loginRecoveryForm.reset();
  loginRecoveryConfirm.setCustomValidity('');
  loginRecoveryDialog.showModal();
});
document.getElementById('login-recovery-cancel').addEventListener('click', () => loginRecoveryDialog.close());
loginRecoveryConfirm.addEventListener('input', () => loginRecoveryConfirm.setCustomValidity(''));

loginRecoveryForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = loginRecoveryEmail.value.trim().toLowerCase();
  const senha = loginRecoveryPassword.value;
  loginRecoveryConfirm.setCustomValidity(
    senha === loginRecoveryConfirm.value ? '' : 'As senhas não conferem.'
  );
  if (!loginRecoveryForm.reportValidity()) return;

  const usuario = usuarios.find(conta => conta.email.toLowerCase() === email);
  if (!usuario) {
    loginRecoveryEmail.setCustomValidity('Não há usuário cadastrado com este e-mail.');
    loginRecoveryEmail.reportValidity();
    return;
  }

  usuarios = usuarios.map(conta => conta.id === usuario.id ? { ...conta, senha } : conta);
  saveStore();
  loginEmail.value = email;
  loginPassword.value = '';
  hideLoginPassword();
  loginFeedback.textContent = 'Senha redefinida. Entre com a nova senha.';
  loginRecoveryForm.reset();
  loginRecoveryDialog.close();
});
loginRecoveryEmail.addEventListener('input', () => loginRecoveryEmail.setCustomValidity(''));

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

  const statusList = ['TODOS', 'ATIVO', 'ATRASADO', 'DEVOLVIDO', 'CANCELADO'];
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
        </tr>`;
      }).join('')
    : `<tr class="empty"><td colspan="6">Nenhum empréstimo nesta categoria</td></tr>`;
}

// ── Solicitações ─────────────────────────────────────────
function renderSolicitacoes() {
  document.getElementById('sol-count').textContent =
    `${solicitacoes.filter(s => s.st === 'PENDENTE').length} aguardando aprovação`;

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

function setSol(id, st) {
  solicitacoes = solicitacoes.map(s => s.id === id ? Object.assign({}, s, { st }) : s);
  saveStore();
  renderSolicitacoes();
  renderDashboard();
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
const MASTER_PASSWORD = '2031';

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
  const requiresMaster = ['ADMINISTRADOR', 'BIBLIOTECARIO'].includes(usrType.value);
  usrMasterGroup.hidden = !requiresMaster;
  usrMasterPassword.required = requiresMaster;
  if (!requiresMaster) usrMasterPassword.setCustomValidity('');
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

usrForm.addEventListener('submit', event => {
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
  usrMasterPassword.setCustomValidity(
    ['ADMINISTRADOR', 'BIBLIOTECARIO'].includes(tipo) && usrMasterPassword.value !== MASTER_PASSWORD
      ? 'Senha master incorreta.'
      : ''
  );

  if (!usrForm.reportValidity()) return;

  const id = Math.max(0, ...usuarios.map(usuario => usuario.id)) + 1;
  usuarios = [...usuarios, { id, nome, email, tipo, senha: usrPassword.value }];
  saveStore();
  renderUsuarios();
  usrForm.reset();
  hideUserPassword();
  updateMasterField();
  usrDialog.close();

  if (registeringFromLogin) {
    registeringFromLogin = false;
    loginEmail.value = email;
    loginPassword.value = '';
    hideLoginPassword();
    loginFeedback.textContent = 'Cadastro concluído. Entre com seu e-mail e senha.';
    loginScreen.hidden = false;
    sidebar.inert = true;
    main.inert = true;
    loginEmail.focus();
  }
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
    categorias.map(c => `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`).join('');
}

document.getElementById('book-add-btn').addEventListener('click', () => {
  bookForm.reset();
  bookIsbn.setCustomValidity('');
  populateBookCategories();
  bookDialog.showModal();
});
document.getElementById('book-cancel-btn').addEventListener('click', () => bookDialog.close());
bookIsbn.addEventListener('input', () => bookIsbn.setCustomValidity(''));

bookForm.addEventListener('submit', event => {
  event.preventDefault();
  const isbn = bookIsbn.value.trim();
  bookIsbn.setCustomValidity(
    livros.some(livro => livro.isbn.toLowerCase() === isbn.toLowerCase())
      ? 'Este ISBN já está cadastrado.'
      : ''
  );
  if (!bookForm.reportValidity()) return;

  const id = Math.max(0, ...livros.map(livro => livro.id)) + 1;
  const total = Number(document.getElementById('book-copies').value);
  livros = [...livros, {
    id,
    titulo: document.getElementById('book-title').value.trim(),
    cat: bookCategory.value,
    isbn,
    editora: document.getElementById('book-publisher').value.trim(),
    ano: Number(document.getElementById('book-year').value),
    total,
    disp: total,
  }];
  saveStore();
  renderLivros(document.getElementById('livros-srch').value);
  renderDashboard();
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

loanForm.addEventListener('submit', event => {
  event.preventDefault();
  const livro = livros.find(item => item.id === Number(loanBook.value));
  const usuario = usuarios.find(item => item.id === Number(loanUser.value));
  if (!livro || !usuario || livro.disp < 1 || !loanForm.reportValidity()) return;

  const id = Math.max(0, ...emprestimos.map(emprestimo => emprestimo.id)) + 1;
  emprestimos = [...emprestimos, {
    id,
    livro: livro.titulo,
    user: usuario.nome,
    de: loanDate.value,
    ate: loanDueDate.value,
    st: 'ATIVO',
  }];
  livros = livros.map(item => item.id === livro.id ? { ...item, disp: item.disp - 1 } : item);
  saveStore();
  renderEmprestimos();
  renderLivros(document.getElementById('livros-srch').value);
  renderDashboard();
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

categoryForm.addEventListener('submit', event => {
  event.preventDefault();
  const nome = categoryName.value.trim();
  categoryName.setCustomValidity(
    categorias.some(categoria => categoria.nome.toLowerCase() === nome.toLowerCase())
      ? 'Esta categoria já existe.'
      : ''
  );
  if (!categoryForm.reportValidity()) return;

  const id = Math.max(0, ...categorias.map(categoria => categoria.id)) + 1;
  categorias = [...categorias, {
    id,
    nome,
    desc: document.getElementById('category-description').value.trim(),
  }];
  saveStore();
  renderCategorias();
  populateBookCategories();
  categoryForm.reset();
  categoryDialog.close();
});

// ── Inicialização ────────────────────────────────────────
renderDashboard();
renderLivros();
renderEmprestimos();
renderSolicitacoes();
renderUsuarios();
renderCategorias();
