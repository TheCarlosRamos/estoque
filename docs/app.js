const LOW_STOCK_LIMIT = 5;
const STORAGE_KEY = "pages_simple_book_inventory";

let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"books":[],"logs":[]}');
let selectedIds = new Set();

function $(id) {
  return document.getElementById(id);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function makeId() {
  return `book-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addLog(book, type, qty, reason) {
  state.logs.unshift({
    date: new Date().toLocaleString("pt-BR"),
    book: book.title,
    type,
    qty,
    reason,
  });
}

function addBook() {
  const title = $("title").value.trim();
  const author = $("author").value.trim();

  if (!title || !author) {
    alert("Informe titulo e autor.");
    return;
  }

  const book = { id: makeId(), title, author, qty: 0 };
  state.books.push(book);
  addLog(book, "Cadastro", 0, "Livro adicionado");

  $("title").value = "";
  $("author").value = "";
  save();
}

function findBook(id) {
  return state.books.find((book) => book.id === id);
}

function moveBook(id, delta) {
  const book = findBook(id);
  if (!book) return;

  const qty = Number(prompt("Quantidade"));
  if (!Number.isInteger(qty) || qty <= 0) {
    alert("Informe uma quantidade inteira maior que zero.");
    return;
  }

  if (delta < 0 && book.qty < qty) {
    alert("Saida bloqueada. O estoque nao pode ficar negativo.");
    return;
  }

  const reason = prompt("Motivo");
  if (!reason) return;

  book.qty += delta * qty;
  addLog(book, delta > 0 ? "Entrada" : "Saida", qty, reason);
  save();
}

function editBook(id) {
  const book = findBook(id);
  if (!book) return;

  const title = prompt("Novo titulo", book.title);
  if (title === null) return;

  const author = prompt("Novo autor", book.author);
  if (author === null) return;

  book.title = title.trim() || book.title;
  book.author = author.trim() || book.author;
  addLog(book, "Edicao", 0, "Titulo/autor atualizados");
  save();
}

function deleteBook(id) {
  const index = state.books.findIndex((book) => book.id === id);
  if (index < 0) return;

  if (confirm(`Excluir "${state.books[index].title}"?`)) {
    addLog(state.books[index], "Exclusao", state.books[index].qty, "Livro removido");
    selectedIds.delete(id);
    state.books.splice(index, 1);
    save();
  }
}

function getFilteredBooks() {
  const search = $("search").value.trim().toLowerCase();

  return state.books.filter((book) => {
    const matchesSearch =
      !search ||
      book.title.toLowerCase().includes(search) ||
      book.author.toLowerCase().includes(search);
    const matchesStock = !$("lowStock").checked || book.qty < LOW_STOCK_LIMIT;

    return matchesSearch && matchesStock;
  });
}

function toggleSelection(id, checked) {
  if (checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }
  renderSelection();
}

function selectVisibleBooks() {
  getFilteredBooks().forEach((book) => selectedIds.add(book.id));
  render();
}

function clearSelection() {
  selectedIds.clear();
  render();
}

function batchMove(delta) {
  const books = state.books.filter((book) => selectedIds.has(book.id));
  if (!books.length) {
    alert("Selecione pelo menos um livro.");
    return;
  }

  const qty = Number(prompt("Quantidade para cada livro"));
  if (!Number.isInteger(qty) || qty <= 0) {
    alert("Informe uma quantidade inteira maior que zero.");
    return;
  }

  if (delta < 0) {
    const blocked = books.filter((book) => book.qty < qty);
    if (blocked.length) {
      alert(`Saida bloqueada. Estoque insuficiente para: ${blocked.map((book) => book.title).join(", ")}.`);
      return;
    }
  }

  const reason = prompt("Motivo");
  if (!reason) return;

  books.forEach((book) => {
    book.qty += delta * qty;
    addLog(book, delta > 0 ? "Entrada em lote" : "Saida em lote", qty, reason);
  });
  save();
}

function exportCSV() {
  const rows = state.books.map((book) => `"${book.title}","${book.author}",${book.qty}`).join("\n");
  const csv = `Titulo,Autor,Quantidade\n${rows}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "estoque-livros.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function renderSelection() {
  $("selectedCount").textContent = selectedIds.size;
}

function renderSummary() {
  $("totalBooks").textContent = state.books.length;
  $("totalStock").textContent = state.books.reduce((sum, book) => sum + book.qty, 0);
  $("lowStockCount").textContent = state.books.filter((book) => book.qty < LOW_STOCK_LIMIT).length;
  renderSelection();
}

function renderBooks() {
  const books = getFilteredBooks();

  $("books").innerHTML = books.length
    ? books
        .map(
          (book) => `
            <article class="book">
              <label class="select-book">
                <input type="checkbox" ${selectedIds.has(book.id) ? "checked" : ""} onchange="toggleSelection('${book.id}', this.checked)">
                Selecionar
              </label>
              <div>
                <h3>${escapeHtml(book.title)}</h3>
                <p>${escapeHtml(book.author)}</p>
                <strong class="${book.qty < LOW_STOCK_LIMIT ? "low" : ""}">${book.qty} em estoque</strong>
              </div>
              <div class="book-actions">
                <button onclick="moveBook('${book.id}', 1)">Entrada</button>
                <button class="secondary" onclick="moveBook('${book.id}', -1)">Saida</button>
                <button class="secondary" onclick="editBook('${book.id}')">Editar</button>
                <button class="danger" onclick="deleteBook('${book.id}')">Excluir</button>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty">Nenhum livro encontrado.</p>';
}

function renderReport() {
  $("report").innerHTML = state.logs.length
    ? state.logs
        .map(
          (log) => `
            <tr>
              <td>${escapeHtml(log.date)}</td>
              <td>${escapeHtml(log.book)}</td>
              <td>${escapeHtml(log.type)}</td>
              <td>${log.qty}</td>
              <td>${escapeHtml(log.reason)}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="5">Nenhuma movimentacao registrada.</td></tr>';
}

function render() {
  renderSummary();
  renderBooks();
  renderReport();
}

render();
