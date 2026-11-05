import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

// ── Dados e API ──────────────────────────────────────────
let livros = [];
let emprestimos = [];
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
    userId: loan.userId,
    bookId: loan.bookId,
    livro: loan.book.title,
    user: loan.user.name,
    de: loan.borrowedAt.slice(0, 10),
    ate: loan.dueAt.slice(0, 10),
    borrowedAt: loan.borrowedAt,
    dueAt: loan.dueAt,
    status: loan.status,
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
  } else if (['ALUNO', 'PROFESSOR'].includes(usuarioAtual.role)) {
    emprestimos = (await apiRequest('/loans')).map(mapLoan);
  } else {
    usuarios = [];
    categorias = [];
    emprestimos = [];
  }

  renderDashboard();
  renderLivros(document.getElementById('livros-srch').value);
  renderEmprestimos();
  renderUsuarios();
  renderCategorias();
}

function formatarDataRelatorio(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-BR');
}

function filtrarLivros(query = '') {
  const normalizedQuery = query.trim().toLowerCase();
  return livros.filter(book =>
    book.titulo.toLowerCase().includes(normalizedQuery) ||
    book.isbn.toLowerCase().includes(normalizedQuery) ||
    book.cat.toLowerCase().includes(normalizedQuery)
  );
}

function obterDadosRelatorio(section) {
  const staffRoles = ['BIBLIOTECARIO', 'ADMINISTRADOR'];
  const isLibraryStaff = staffRoles.includes(usuarioAtual?.role);

  if (section === 'dashboard') {
    if (!isLibraryStaff) throw new Error('O relatório do painel é exclusivo da equipe da biblioteca.');
    const activeLoans = emprestimos.filter(loan => loan.st === 'ATIVO').length;
    return {
      title: 'Relatório do painel',
      fileName: 'painel',
      sections: [
        {
          title: 'Indicadores',
          head: ['Indicador', 'Resultado'],
          body: [
            ['Títulos cadastrados', String(livros.length)],
            ['Exemplares no acervo', String(livros.reduce((total, book) => total + book.total, 0))],
            ['Exemplares disponíveis', String(livros.reduce((total, book) => total + book.disp, 0))],
            ['Empréstimos ativos', String(activeLoans)],
            ['Empréstimos atrasados', String(emprestimos.filter(loan => loan.st === 'ATRASADO').length)],
            ['Usuários cadastrados', String(usuarios.length)],
            ['Categorias', String(categorias.length)],
          ],
        },
        {
          title: 'Empréstimos recentes',
          head: ['Livro', 'Usuário', 'Empréstimo', 'Devolução', 'Status'],
          body: emprestimos.slice(0, 4).map(loan => [
            loan.livro,
            loan.user,
            formatarDataRelatorio(loan.de),
            formatarDataRelatorio(loan.ate),
            loan.st,
          ]),
        },
        {
          title: 'Disponibilidade do acervo',
          head: ['Livro', 'Categoria', 'Exemplares', 'Disponíveis'],
          body: livros.map(book => [book.titulo, book.cat, String(book.total), String(book.disp)]),
        },
      ],
    };
  }

  if (section === 'books') {
    const query = document.getElementById('livros-srch').value;
    return {
      title: 'Relatório do acervo',
      fileName: 'acervo',
      subtitle: query.trim() ? `Busca: ${query.trim()}` : undefined,
      sections: [{
        title: 'Livros',
        head: ['Título', 'Categoria', 'ISBN', 'Editora', 'Ano', 'Exemplares', 'Disponíveis'],
        body: filtrarLivros(query).map(book => [
          book.titulo,
          book.cat,
          book.isbn,
          book.editora || '—',
          book.ano ? String(book.ano) : '—',
          String(book.total),
          String(book.disp),
        ]),
      }],
    };
  }

  if (section === 'loans') {
    const filteredLoans = empFilter === 'TODOS'
      ? emprestimos
      : emprestimos.filter(loan => loan.st === empFilter);
    const body = filteredLoans.map(loan => {
      const row = [loan.livro];
      if (isLibraryStaff) row.push(loan.user);
      row.push(formatarDataRelatorio(loan.de), formatarDataRelatorio(loan.ate), loan.st);
      return row;
    });

    return {
      title: usuarioAtual?.role === 'ALUNO' || usuarioAtual?.role === 'PROFESSOR'
        ? 'Relatório dos meus empréstimos'
        : 'Relatório de empréstimos',
      fileName: 'emprestimos',
      subtitle: `Filtro de status: ${empFilter}`,
      sections: [{
        title: 'Empréstimos',
        head: isLibraryStaff
          ? ['Livro', 'Usuário', 'Empréstimo', 'Devolução', 'Status']
          : ['Livro', 'Empréstimo', 'Devolução', 'Status'],
        body,
      }],
    };
  }

  if (section === 'users') {
    if (!isLibraryStaff) throw new Error('Você não tem permissão para exportar usuários.');
    return {
      title: 'Relatório de usuários',
      fileName: 'usuarios',
      sections: [{
        title: 'Usuários cadastrados',
        head: ['Nome', 'E-mail', 'Perfil'],
        body: usuarios.map(user => [user.nome, user.email, user.tipo]),
      }],
    };
  }

  if (section === 'categories') {
    if (!isLibraryStaff) throw new Error('Você não tem permissão para exportar categorias.');
    return {
      title: 'Relatório de categorias',
      fileName: 'categorias',
      sections: [{
        title: 'Categorias do acervo',
        head: ['Categoria', 'Descrição'],
        body: categorias.map(category => [category.nome, category.desc || '—']),
      }],
    };
  }

  throw new Error('Relatório indisponível para esta seção.');
}

function gerarRelatorioPDF(section) {
  if (!usuarioAtual) throw new Error('Entre no sistema para gerar um relatório.');
  const report = obterDadosRelatorio(section);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;

  pdf.setProperties({ title: report.title, author: 'SCEB' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(19, 32, 56);
  pdf.text('SCEB', margin, 17);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.text(report.title, margin, 26);
  pdf.setFontSize(9);
  pdf.setTextColor(80, 96, 120);
  pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${usuarioAtual.name}`, margin, 33);
  let cursorY = 43;
  if (report.subtitle) {
    pdf.text(report.subtitle, margin, 38);
    cursorY = 48;
  }

  report.sections.forEach(sectionData => {
    if (cursorY > pageHeight - 24) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(37, 54, 89);
    pdf.text(sectionData.title, margin, cursorY);
    autoTable(pdf, {
      startY: cursorY + 4,
      margin: { left: margin, right: margin, bottom: 14 },
      head: [sectionData.head],
      body: sectionData.body.length
        ? sectionData.body
        : [[{ content: 'Nenhum registro encontrado.', colSpan: sectionData.head.length, styles: { halign: 'center' } }]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [37, 54, 89], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 244, 249] },
      didDrawPage: ({ pageNumber }) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(107, 131, 168);
        pdf.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      },
    });
    cursorY = (pdf.lastAutoTable?.finalY ?? cursorY) + 12;
  });

  const date = new Date().toISOString().slice(0, 10);
  pdf.save(`sceb-${report.fileName}-${date}.pdf`);
}

document.querySelectorAll('[data-report]').forEach(button => {
  button.addEventListener('click', () => {
    try {
      gerarRelatorioPDF(button.dataset.report);
    } catch (error) {
      window.alert(error.message);
    }
  });
});

// ── Utilitários ──────────────────────────────────────────
function badge(label) {
  return `<span class="badge b-${label.toLowerCase()}">${label}</span>`;
}

function renderAdminActions(entity, id, label) {
  const safeId = escapeHtml(String(id));
  const safeLabel = escapeHtml(label);
  return `<div class="record-actions">
    <button class="action-button" type="button" data-${entity}-edit="${safeId}" aria-label="Editar ${safeLabel}" title="Editar ${safeLabel}">
      <span aria-hidden="true">✎</span>
    </button>
    <button class="action-button is-destructive" type="button" data-${entity}-delete="${safeId}" aria-label="Remover ${safeLabel}" title="Remover ${safeLabel}">
      <span aria-hidden="true">×</span>
    </button>
  </div>`;
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
  const paginasRestritas = ['dashboard', 'usuarios', 'categorias'];

  document.querySelectorAll('.nav-btn').forEach(button => {
    button.hidden = consultaOnly && paginasRestritas.includes(button.dataset.page);
  });
  document.querySelector('.nav-btn[data-page="emprestimos"]').textContent =
    consultaOnly ? '📚 Meus empréstimos' : '🔄 Empréstimos';
  paginasRestritas.forEach(page => {
    document.getElementById(`page-${page}`).hidden = consultaOnly;
  });
  document.querySelector('#page-emprestimos .ph-title').textContent =
    consultaOnly ? 'Meus empréstimos' : 'Empréstimos';
  document.getElementById('emp-user-heading').hidden = consultaOnly;
  document.getElementById('emp-actions-heading').hidden = consultaOnly;
  ['book-add-btn', 'loan-add-btn', 'category-add-btn'].forEach(id => {
    document.getElementById(id).hidden = consultaOnly;
  });
  document.getElementById('usr-add-btn').hidden = role !== 'ADMINISTRADOR';
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

  document.getElementById('d-emp').innerHTML = emprestimos.slice(0, 4).map(e =>
    `<div class="li">
      <div class="usr-card-info">
        <p class="li-t">${escapeHtml(e.livro)}</p>
        <p class="li-s">${escapeHtml(e.user)}</p>
      </div>
      ${badge(e.st)}
    </div>`
  ).join('');

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
  const isAdministrator = usuarioAtual?.role === 'ADMINISTRADOR';
  document.getElementById('book-actions-heading').hidden = !isAdministrator;
  document.getElementById('livros-count').textContent = `${livros.length} títulos cadastrados`;
  const filtrados = filtrarLivros(q);

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
          ${isAdministrator ? `<td>${renderAdminActions('book', l.id, l.titulo)}</td>` : ''}
        </tr>`;
      }).join('')
    : `<tr class="empty"><td colspan="${isAdministrator ? 6 : 5}">Nenhum livro encontrado</td></tr>`;

  document.querySelectorAll('[data-book-edit]').forEach(button => {
    button.addEventListener('click', () => abrirEdicaoLivro(button.dataset.bookEdit));
  });
  document.querySelectorAll('[data-book-delete]').forEach(button => {
    button.addEventListener('click', () => removerLivro(button.dataset.bookDelete));
  });
}

document.getElementById('livros-srch').addEventListener('input', e => renderLivros(e.target.value));

// ── Empréstimos ──────────────────────────────────────────
let empFilter = 'TODOS';

function renderEmprestimos() {
  const consultaOnly = ['ALUNO', 'PROFESSOR'].includes(usuarioAtual?.role);
  const isAdministrator = usuarioAtual?.role === 'ADMINISTRADOR';
  document.getElementById('emp-table').classList.toggle('is-staff', !consultaOnly);
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
          <td class="td-id" title="${escapeHtml(String(e.id))}">#${escapeHtml(String(e.id).padStart(3, '0'))}</td>
          <td class="td-t">${escapeHtml(e.livro)}</td>
          ${consultaOnly ? '' : `<td class="td-m">${escapeHtml(e.user)}</td>`}
          <td class="td-mo">${escapeHtml(e.de)}</td>
          <td class="td-mo" style="${corData}">${escapeHtml(e.ate)}</td>
          <td>${badge(e.st)}</td>
          ${consultaOnly ? '' : `<td>
            ${e.st === 'DEVOLVIDO' ? '' : `<button class="btn-o loan-return-button" type="button" data-return-loan="${escapeHtml(e.id)}" aria-label="Registrar devolução do empréstimo de ${escapeHtml(e.livro)}" title="Registrar devolução">Devolver</button>`}
            ${isAdministrator ? renderAdminActions('loan', e.id, `empréstimo de ${e.livro}`) : ''}
          </td>`}
        </tr>`;
      }).join('')
    : `<tr class="empty"><td colspan="${consultaOnly ? 5 : 7}">Nenhum empréstimo nesta categoria</td></tr>`;

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
  document.querySelectorAll('[data-loan-edit]').forEach(button => {
    button.addEventListener('click', () => abrirEdicaoEmprestimo(button.dataset.loanEdit));
  });
  document.querySelectorAll('[data-loan-delete]').forEach(button => {
    button.addEventListener('click', () => removerEmprestimo(button.dataset.loanDelete));
  });
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
      ${usuarioAtual.role === 'ADMINISTRADOR' && u.id !== usuarioAtual.id ? `
        ${renderAdminActions('user', u.id, u.nome)}` : ''}
    </div>`
  ).join('');

  document.querySelectorAll('[data-user-edit]').forEach(button => {
    button.addEventListener('click', () => abrirEdicaoUsuario(button.dataset.userEdit));
  });
  document.querySelectorAll('[data-user-delete]').forEach(button => {
    button.addEventListener('click', () => removerUsuario(button.dataset.userDelete));
  });
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
const usrDialogTitle = document.getElementById('usr-dialog-title');
const usrDialogDescription = document.getElementById('usr-dialog-description');
const usrPasswordLabel = document.getElementById('usr-password-label');
const usrSubmitButton = document.getElementById('usr-submit-btn');
const usrMasterGroup = document.getElementById('usr-master-group');
const usrMasterPassword = document.getElementById('usr-master-password');
const usrRecoveryDialog = document.getElementById('usr-recovery-dialog');
const usrRecoveryForm = document.getElementById('usr-recovery-form');
const usrRecoveryEmail = document.getElementById('usr-recovery-email');
const usrRecoveryMessage = document.getElementById('usr-recovery-message');
let editingUserId = null;

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

function configurarDialogoUsuario(user = null) {
  editingUserId = user?.id ?? null;
  usrForm.reset();
  usrName.setCustomValidity('');
  usrEmail.setCustomValidity('');
  hideUserPassword();
  updateMasterField();
  usrDialogTitle.textContent = user ? 'Editar usuário' : 'Cadastrar usuário';
  usrDialogDescription.textContent = user
    ? 'Atualize os dados da pessoa. Deixe a senha vazia para mantê-la.'
    : 'Preencha os dados para adicionar uma pessoa ao sistema.';
  usrPasswordLabel.textContent = user ? 'Nova senha (opcional)' : 'Senha de acesso';
  usrPassword.required = !user;
  usrSubmitButton.textContent = user ? 'Salvar alterações' : 'Cadastrar';

  if (user) {
    usrName.value = user.nome;
    usrEmail.value = user.email;
    usrType.value = user.tipo;
  }
}

function abrirEdicaoUsuario(userId) {
  if (usuarioAtual.role !== 'ADMINISTRADOR') return;
  const user = usuarios.find(candidate => candidate.id === userId);
  if (!user || user.id === usuarioAtual.id) return;
  configurarDialogoUsuario(user);
  usrDialog.showModal();
}

async function removerUsuario(userId) {
  if (usuarioAtual.role !== 'ADMINISTRADOR') return;
  const user = usuarios.find(candidate => candidate.id === userId);
  if (!user || user.id === usuarioAtual.id) return;
  if (!window.confirm(`Remover o usuário ${user.nome}?`)) return;

  try {
    await apiRequest(`/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    await carregarDados();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById('usr-add-btn').addEventListener('click', () => {
  if (usuarioAtual?.role !== 'ADMINISTRADOR') return;
  configurarDialogoUsuario();
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
    usuarios.some(usuario =>
      usuario.id !== editingUserId && usuario.email.toLowerCase() === email.toLowerCase()
    )
      ? 'Este e-mail já está cadastrado.'
      : ''
  );
  if (!usrForm.reportValidity()) return;

  const input = {
    name: nome,
    email,
    role: tipo,
    ...(usrPassword.value ? { password: usrPassword.value } : {}),
  };

  try {
    await apiRequest(editingUserId ? `/users/${encodeURIComponent(editingUserId)}` : '/users', {
      method: editingUserId ? 'PATCH' : 'POST',
      body: JSON.stringify(editingUserId ? input : { ...input, password: usrPassword.value }),
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
  const isAdministrator = usuarioAtual?.role === 'ADMINISTRADOR';
  document.getElementById('cat-count').textContent = `${categorias.length} categorias`;

  document.getElementById('cat-grid').innerHTML = categorias.map(c =>
    `<div class="ccard">
      <div class="cico">🏷️</div>
      <div>
        <p class="cname">${escapeHtml(c.nome)}</p>
        <p class="cdesc">${escapeHtml(c.desc)}</p>
      </div>
      ${isAdministrator ? renderAdminActions('category', c.id, c.nome) : ''}
    </div>`
  ).join('');

  document.querySelectorAll('[data-category-edit]').forEach(button => {
    button.addEventListener('click', () => abrirEdicaoCategoria(button.dataset.categoryEdit));
  });
  document.querySelectorAll('[data-category-delete]').forEach(button => {
    button.addEventListener('click', () => removerCategoria(button.dataset.categoryDelete));
  });
}

const bookDialog = document.getElementById('book-dialog');
const bookForm = document.getElementById('book-form');
const bookCategory = document.getElementById('book-category');
const bookIsbn = document.getElementById('book-isbn');
const bookTitle = document.getElementById('book-title');
const bookPublisher = document.getElementById('book-publisher');
const bookYear = document.getElementById('book-year');
const bookCopies = document.getElementById('book-copies');
const bookDialogTitle = document.getElementById('book-dialog-title');
const bookDialogDescription = document.getElementById('book-dialog-description');
const bookSubmitButton = bookForm.querySelector('button[type="submit"]');
let editingBookId = null;

function populateBookCategories() {
  bookCategory.innerHTML = '<option value="">Selecione uma categoria</option>' +
    categorias.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join('');
}

function configurarDialogoLivro(book = null) {
  editingBookId = book?.id ?? null;
  bookForm.reset();
  bookIsbn.setCustomValidity('');
  populateBookCategories();
  const isEditing = Boolean(book);
  bookDialogTitle.textContent = isEditing ? 'Editar livro' : 'Cadastrar livro';
  bookDialogDescription.textContent = isEditing
    ? 'Atualize os dados do livro. Exemplares já emprestados não podem ser removidos do total.'
    : 'Informe os dados do título para adicioná-lo ao acervo.';
  bookSubmitButton.textContent = isEditing ? 'Salvar alterações' : 'Cadastrar livro';
  bookPublisher.required = !isEditing;
  bookYear.required = !isEditing;

  if (book) {
    bookTitle.value = book.titulo;
    bookCategory.value = book.categoryId;
    bookIsbn.value = book.isbn;
    bookPublisher.value = book.editora;
    bookYear.value = book.ano;
    bookCopies.value = book.total;
  }
  bookDialog.showModal();
}

function abrirEdicaoLivro(bookId) {
  if (usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const book = livros.find(item => item.id === bookId);
  if (book) configurarDialogoLivro(book);
}

async function removerLivro(bookId) {
  if (usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const book = livros.find(item => item.id === bookId);
  if (!book || !window.confirm(`Remover o livro "${book.titulo}"? Livros com empréstimos associados não podem ser removidos.`)) return;

  try {
    await apiRequest(`/books/${encodeURIComponent(book.id)}`, { method: 'DELETE' });
    await carregarDados();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById('book-add-btn').addEventListener('click', () => {
  configurarDialogoLivro();
});
document.getElementById('book-cancel-btn').addEventListener('click', () => bookDialog.close());
bookIsbn.addEventListener('input', () => bookIsbn.setCustomValidity(''));

bookForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (editingBookId && usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const isbn = bookIsbn.value.trim();
  bookIsbn.setCustomValidity(
    livros.some(livro =>
      livro.id !== editingBookId && livro.isbn.toLowerCase() === isbn.toLowerCase()
    )
      ? 'Este ISBN já está cadastrado.'
      : ''
  );
  if (!bookForm.reportValidity()) return;

  const input = {
    title: bookTitle.value.trim(),
    categoryId: bookCategory.value,
    isbn,
    publisher: bookPublisher.value.trim() || null,
    publicationYear: bookYear.value ? Number(bookYear.value) : null,
    copies: Number(bookCopies.value),
  };
  const isEditing = Boolean(editingBookId);

  try {
    await apiRequest(isEditing ? `/books/${encodeURIComponent(editingBookId)}` : '/books', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify(isEditing
        ? input
        : { ...input, publisher: input.publisher || '', publicationYear: input.publicationYear ?? 0 }),
    });
    await carregarDados();
  } catch (error) {
    bookIsbn.setCustomValidity(error.message);
    bookIsbn.reportValidity();
    return;
  }

  bookForm.reset();
  bookPublisher.required = true;
  bookYear.required = true;
  bookDialog.close();
});

const loanDialog = document.getElementById('loan-dialog');
const loanForm = document.getElementById('loan-form');
const loanBook = document.getElementById('loan-book');
const loanUser = document.getElementById('loan-user');
const loanDate = document.getElementById('loan-date');
const loanDueDate = document.getElementById('loan-due-date');
const loanSubmit = document.getElementById('loan-submit-btn');
const loanDialogTitle = document.getElementById('loan-dialog-title');
const loanDialogDescription = document.getElementById('loan-dialog-description');
const loanStatusGroup = document.getElementById('loan-status-group');
const loanStatus = document.getElementById('loan-status');
let editingLoanId = null;

function toLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function populateLoanOptions(loan = null) {
  const disponiveis = loan ? livros : livros.filter(livro => livro.disp > 0);
  loanBook.innerHTML = disponiveis.length
    ? '<option value="">Selecione um livro</option>' + disponiveis.map(livro =>
        `<option value="${livro.id}">${escapeHtml(livro.titulo)} (${livro.disp} disponível(is))</option>`
      ).join('')
    : '<option value="">Nenhum livro disponível</option>';
  loanUser.innerHTML = '<option value="">Selecione um usuário</option>' + usuarios.map(usuario =>
    `<option value="${usuario.id}">${escapeHtml(usuario.nome)}</option>`
  ).join('');
  loanSubmit.disabled = !loan && disponiveis.length === 0;
}

function configurarDialogoEmprestimo(loan = null) {
  editingLoanId = loan?.id ?? null;
  loanForm.reset();
  populateLoanOptions(loan);
  const hoje = new Date();
  const devolucao = new Date(hoje);
  devolucao.setDate(devolucao.getDate() + 14);
  const isEditing = Boolean(loan);
  loanDialogTitle.textContent = isEditing ? 'Editar empréstimo' : 'Registrar empréstimo';
  loanDialogDescription.textContent = isEditing
    ? 'Atualize o usuário, livro, datas ou status do empréstimo.'
    : 'Selecione um exemplar disponível e o usuário responsável.';
  loanSubmit.textContent = isEditing ? 'Salvar alterações' : 'Registrar';
  loanStatusGroup.hidden = !isEditing;
  loanDate.value = isEditing ? loan.de : toLocalDate(hoje);
  loanDueDate.value = isEditing ? loan.ate : toLocalDate(devolucao);
  loanDueDate.min = loanDate.value;
  if (isEditing) {
    loanBook.value = loan.bookId;
    loanUser.value = loan.userId;
    loanStatus.value = loan.status;
  }
  loanDialog.showModal();
}

function abrirEdicaoEmprestimo(loanId) {
  if (usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const loan = emprestimos.find(item => item.id === loanId);
  if (loan) configurarDialogoEmprestimo(loan);
}

async function removerEmprestimo(loanId) {
  if (usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const loan = emprestimos.find(item => item.id === loanId);
  if (!loan || !window.confirm(`Remover o empréstimo de "${loan.livro}" para ${loan.user}?`)) return;

  try {
    await apiRequest(`/loans/${encodeURIComponent(loan.id)}`, { method: 'DELETE' });
    await carregarDados();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById('loan-add-btn').addEventListener('click', () => {
  configurarDialogoEmprestimo();
});
document.getElementById('loan-cancel-btn').addEventListener('click', () => loanDialog.close());
loanDate.addEventListener('change', () => {
  loanDueDate.min = loanDate.value;
  if (loanDueDate.value < loanDate.value) loanDueDate.value = loanDate.value;
});
loanDueDate.addEventListener('input', () => loanDueDate.setCustomValidity(''));

loanForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (editingLoanId && usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const livro = livros.find(item => item.id === loanBook.value);
  const usuario = usuarios.find(item => item.id === loanUser.value);
  const isEditing = Boolean(editingLoanId);
  if (!livro || !usuario || (!isEditing && livro.disp < 1) || !loanForm.reportValidity()) return;

  const borrowedAt = new Date(`${loanDate.value}T12:00:00`).toISOString();
  const dueAt = new Date(`${loanDueDate.value}T12:00:00`).toISOString();
  if (new Date(dueAt) <= new Date(borrowedAt)) {
    loanDueDate.setCustomValidity('A devolução deve ser posterior à data do empréstimo.');
    loanDueDate.reportValidity();
    return;
  }
  loanDueDate.setCustomValidity('');

  try {
    await apiRequest(isEditing ? `/loans/${encodeURIComponent(editingLoanId)}` : '/loans', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify(isEditing
        ? {
            bookId: livro.id,
            userId: usuario.id,
            borrowedAt,
            dueAt,
            status: loanStatus.value,
          }
        : {
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
const categoryDescription = document.getElementById('category-description');
const categoryDialogTitle = document.getElementById('category-dialog-title');
const categoryDialogDescription = document.getElementById('category-dialog-description');
const categorySubmitButton = categoryForm.querySelector('button[type="submit"]');
let editingCategoryId = null;

function configurarDialogoCategoria(category = null) {
  editingCategoryId = category?.id ?? null;
  categoryForm.reset();
  categoryName.setCustomValidity('');
  const isEditing = Boolean(category);
  categoryDescription.required = !isEditing;
  categoryDialogTitle.textContent = isEditing ? 'Editar categoria' : 'Nova categoria';
  categoryDialogDescription.textContent = isEditing
    ? 'Atualize o nome e a descrição da categoria.'
    : 'Organize o acervo com uma categoria.';
  categorySubmitButton.textContent = isEditing ? 'Salvar alterações' : 'Criar categoria';
  if (category) {
    categoryName.value = category.nome;
    categoryDescription.value = category.desc;
  }
  categoryDialog.showModal();
}

function abrirEdicaoCategoria(categoryId) {
  if (usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const category = categorias.find(item => item.id === categoryId);
  if (category) configurarDialogoCategoria(category);
}

async function removerCategoria(categoryId) {
  if (usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const category = categorias.find(item => item.id === categoryId);
  if (!category || !window.confirm(`Remover a categoria "${category.nome}"? Categorias usadas por livros não podem ser removidas.`)) return;

  try {
    await apiRequest(`/categories/${encodeURIComponent(category.id)}`, { method: 'DELETE' });
    await carregarDados();
  } catch (error) {
    window.alert(error.message);
  }
}

document.getElementById('category-add-btn').addEventListener('click', () => {
  configurarDialogoCategoria();
});
document.getElementById('category-cancel-btn').addEventListener('click', () => categoryDialog.close());
categoryName.addEventListener('input', () => categoryName.setCustomValidity(''));

categoryForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (editingCategoryId && usuarioAtual?.role !== 'ADMINISTRADOR') return;
  const nome = categoryName.value.trim();
  categoryName.setCustomValidity(
    categorias.some(categoria =>
      categoria.id !== editingCategoryId && categoria.nome.toLowerCase() === nome.toLowerCase()
    )
      ? 'Esta categoria já existe.'
      : ''
  );
  if (!categoryForm.reportValidity()) return;

  const isEditing = Boolean(editingCategoryId);
  try {
    await apiRequest(isEditing ? `/categories/${encodeURIComponent(editingCategoryId)}` : '/categories', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify({
        name: nome,
        description: categoryDescription.value.trim(),
      }),
    });
    await carregarDados();
  } catch (error) {
    categoryName.setCustomValidity(error.message);
    categoryName.reportValidity();
    return;
  }

  categoryForm.reset();
  categoryDescription.required = true;
  categoryDialog.close();
});

// ── Inicialização ────────────────────────────────────────
restaurarSessao();
