let currentUser = null;
let books = JSON.parse(localStorage.getItem("books") || "[]");
let logs = JSON.parse(localStorage.getItem("logs") || "[]");
let users = JSON.parse(localStorage.getItem("users") || "[]");
let selectedBookIds = new Set();
let sharedStorageReady = false;
let sharedStorageErrorShown = false;

const LOW_STOCK_LIMIT = 5;

books = books.map((book, index) => ({
  id: book.id || makeId(index),
  t: book.t || "",
  a: book.a || "",
  qty: Number(book.qty) || 0,
  img: book.img || null,
}));

logs = normalizeLogs(logs);

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeId(seed = "") {
  if (window.crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `book-${Date.now()}-${seed}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBooks(items) {
  return (Array.isArray(items) ? items : []).map((book, index) => ({
    id: book.id || makeId(index),
    t: book.t || "",
    a: book.a || "",
    qty: Number(book.qty) || 0,
    img: book.img || null,
  }));
}

function normalizeLogs(items) {
  return (Array.isArray(items) ? items : []).map((log) =>
    typeof log === "string"
      ? { date: "", user: "", book: log, type: "Historico", qty: 0, reason: "" }
      : log,
  );
}

function normalizeUsers(items) {
  return Array.isArray(items) ? items : [];
}

function applyState(state) {
  books = normalizeBooks(state.books);
  logs = normalizeLogs(state.logs);
  users = normalizeUsers(state.users);
  selectedBookIds = new Set([...selectedBookIds].filter((id) => books.some((book) => book.id === id)));
}

function saveLocalMirror() {
  localStorage.setItem("books", JSON.stringify(books));
  localStorage.setItem("logs", JSON.stringify(logs));
  localStorage.setItem("users", JSON.stringify(users));
}

async function loadSharedState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Shared storage unavailable");

    applyState(await response.json());
    sharedStorageReady = true;
    saveLocalMirror();
  } catch (error) {
    sharedStorageReady = false;
    if (!sharedStorageErrorShown) {
      console.warn("Usando armazenamento local ate o banco compartilhado ser configurado.");
      sharedStorageErrorShown = true;
    }
  }
}

async function persistSharedState() {
  if (!sharedStorageReady) return;

  const response = await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ books, logs, users }),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel salvar no banco compartilhado.");
  }
}

async function save() {
  saveLocalMirror();
  render();

  try {
    await persistSharedState();
  } catch (error) {
    alert("A alteracao ficou salva neste navegador, mas nao foi enviada ao banco compartilhado.");
  }
}

async function login() {
  const name = $("user").value.trim();

  if (!name) {
    alert("Informe o nome do usuario.");
    return;
  }

  currentUser = name;
  $("login").style.display = "none";
  $("app").style.display = "block";
  $("currentUser").textContent = currentUser;

  await loadSharedState();

  if (!users.some((user) => user.name.toLowerCase() === name.toLowerCase())) {
    users.push({ name, role: users.length ? "Operador" : "Administrador" });
    await save();
  } else {
    render();
  }
}

function addMovement(book, type, qty, reason) {
  logs.unshift({
    date: new Date().toLocaleString("pt-BR"),
    user: currentUser,
    book: book.t,
    type,
    qty,
    reason,
  });
}

function resetBookForm() {
  $("title").value = "";
  $("author").value = "";
  $("cover").value = "";
}

function addBook() {
  const t = $("title").value.trim();
  const a = $("author").value.trim();
  const file = $("cover").files[0];

  if (!t || !a) {
    alert("Informe titulo e autor.");
    return;
  }

  const create = (img = null) => {
    const book = { id: makeId(), t, a, qty: 0, img };
    books.push(book);
    addMovement(book, "Cadastro", 0, "Livro adicionado");
    resetBookForm();
    save();
  };

  if (!file) {
    create();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => create(reader.result);
  reader.readAsDataURL(file);
}

function findBook(id) {
  return books.find((book) => book.id === id);
}

function changeQty(id, delta) {
  const book = findBook(id);
  if (!book) return;

  const reason = prompt("Motivo da movimentacao");
  if (!reason) return;

  const nextQty = book.qty + delta;
  if (nextQty < 0) {
    alert("O estoque nao pode ficar negativo.");
    return;
  }

  book.qty = nextQty;
  addMovement(book, delta > 0 ? "Entrada" : "Saida", Math.abs(delta), reason);
  save();
}

function toggleBookSelection(id, checked) {
  if (checked) {
    selectedBookIds.add(id);
  } else {
    selectedBookIds.delete(id);
  }

  renderSelectionSummary();
}

function selectVisibleBooks() {
  getFilteredBooks().forEach((book) => selectedBookIds.add(book.id));
  render();
}

function clearBookSelection() {
  selectedBookIds.clear();
  render();
}

function batchMove(delta) {
  const selectedBooks = books.filter((book) => selectedBookIds.has(book.id));

  if (!selectedBooks.length) {
    alert("Selecione pelo menos um livro.");
    return;
  }

  const qty = Number(prompt("Quantidade para cada livro"));
  if (!Number.isInteger(qty) || qty <= 0) {
    alert("Informe uma quantidade inteira maior que zero.");
    return;
  }

  const reason = prompt("Motivo da movimentacao");
  if (!reason) return;

  if (delta < 0) {
    const blocked = selectedBooks.filter((book) => book.qty < qty);
    if (blocked.length) {
      alert(`Saida bloqueada. Estoque insuficiente para: ${blocked.map((book) => book.t).join(", ")}.`);
      return;
    }
  }

  selectedBooks.forEach((book) => {
    book.qty += delta * qty;
    addMovement(book, delta > 0 ? "Entrada em lote" : "Saida em lote", qty, reason);
  });

  save();
}

function deleteBook(id) {
  const index = books.findIndex((book) => book.id === id);
  if (index < 0) return;

  if (confirm(`Excluir "${books[index].t}"?`)) {
    addMovement(books[index], "Exclusao", books[index].qty, "Livro excluido");
    selectedBookIds.delete(books[index].id);
    books.splice(index, 1);
    save();
  }
}

function editBook(id) {
  const book = findBook(id);
  if (!book) return;

  const nt = prompt("Novo titulo", book.t);
  if (nt === null) return;

  const na = prompt("Novo autor", book.a);
  if (na === null) return;

  const oldTitle = book.t;
  const oldAuthor = book.a;

  book.t = nt.trim() || book.t;
  book.a = na.trim() || book.a;

  if (oldTitle !== book.t || oldAuthor !== book.a) {
    addMovement(book, "Edicao", 0, `Antes: ${oldTitle} / ${oldAuthor}`);
    save();
  }
}

function uploadCover(id) {
  const book = findBook(id);
  if (!book) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      book.img = reader.result;
      addMovement(book, "Capa", 0, "Capa atualizada");
      save();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function getFilteredBooks() {
  const search = $("search").value.trim().toLowerCase();

  return books.filter((book) => {
    const matchesSearch =
      !search ||
      book.t.toLowerCase().includes(search) ||
      book.a.toLowerCase().includes(search);
    const matchesStock = !$("lowStock").checked || book.qty < LOW_STOCK_LIMIT;

    return matchesSearch && matchesStock;
  });
}

function exportExcel() {
  const rows = books
    .map(
      (book) =>
        `<tr><td>${escapeHtml(book.t)}</td><td>${escapeHtml(book.a)}</td><td>${book.qty}</td></tr>`,
    )
    .join("");
  const html = `
    <table>
      <thead><tr><th>Titulo</th><th>Autor</th><th>Quantidade</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "estoque-livros.xls";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function addUser() {
  const name = $("newUser").value.trim();
  const role = $("newRole").value;

  if (!name) {
    alert("Informe o nome do usuario.");
    return;
  }

  if (users.some((user) => user.name.toLowerCase() === name.toLowerCase())) {
    alert("Usuario ja cadastrado.");
    return;
  }

  users.push({ name, role });
  $("newUser").value = "";
  save();
}

function removeUser(index) {
  if (users[index]?.name === currentUser) {
    alert("Voce nao pode remover o usuario logado.");
    return;
  }

  if (confirm("Remover usuario?")) {
    users.splice(index, 1);
    save();
  }
}

function renderBooks() {
  const filtered = getFilteredBooks();
  const el = $("books");

  if (!filtered.length) {
    el.innerHTML = `<p class="empty">Nenhum livro encontrado.</p>`;
    return;
  }

  el.innerHTML = filtered
    .map(
      (book) => `
        <article class="book">
          <label class="select-book">
            <input
              type="checkbox"
              ${selectedBookIds.has(book.id) ? "checked" : ""}
              onchange="toggleBookSelection('${book.id}', this.checked)"
            >
            Selecionar
          </label>
          <div class="cover">
            ${
              book.img
                ? `<img src="${book.img}" alt="Capa de ${escapeHtml(book.t)}">`
                : `<span>Sem capa</span>`
            }
          </div>
          <div class="book-info">
            <h3>${escapeHtml(book.t)}</h3>
            <p>${escapeHtml(book.a)}</p>
            <strong class="${book.qty < LOW_STOCK_LIMIT ? "low" : ""}">${book.qty} em estoque</strong>
          </div>
          <div class="book-actions">
            <button onclick="changeQty('${book.id}', 1)">Entrada</button>
            <button class="secondary" onclick="changeQty('${book.id}', -1)">Saida</button>
            <button class="secondary" onclick="editBook('${book.id}')">Editar</button>
            <button class="secondary" onclick="uploadCover('${book.id}')">Capa</button>
            <button class="danger" onclick="deleteBook('${book.id}')">Excluir</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderReport() {
  $("report").innerHTML = logs.length
    ? logs
        .map(
          (log) => `
            <tr>
              <td>${escapeHtml(log.date)}</td>
              <td>${escapeHtml(log.user)}</td>
              <td>${escapeHtml(log.book)}</td>
              <td>${escapeHtml(log.type)}</td>
              <td>${log.qty}</td>
              <td>${escapeHtml(log.reason)}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">Nenhuma movimentacao registrada.</td></tr>`;
}

function renderUsers() {
  $("users").innerHTML = users
    .map(
      (user, index) => `
        <li>
          <span>${escapeHtml(user.name)}</span>
          <small>${escapeHtml(user.role)}</small>
          <button class="danger" onclick="removeUser(${index})">Remover</button>
        </li>
      `,
    )
    .join("");
}

function renderSelectionSummary() {
  const selectedCount = $("selectedCount");
  if (selectedCount) {
    selectedCount.textContent = selectedBookIds.size;
  }
}

function renderSummary() {
  $("totalBooks").textContent = books.length;
  $("totalStock").textContent = books.reduce((sum, book) => sum + book.qty, 0);
  $("lowStockCount").textContent = books.filter((book) => book.qty < LOW_STOCK_LIMIT).length;
  renderSelectionSummary();
}

function render() {
  renderSummary();
  renderBooks();
  renderReport();
  renderUsers();
}
