# Estoque de Livros Avançado 📚

Um sistema web completo para gerenciamento de estoque de livros, construído com HTML, CSS e JavaScript Vanilla. 

## 🚀 Funcionalidades

*   **Controle de Usuários:** Simulação de login com níveis de acesso (Operador, Administrador, Consulta).
*   **Gerenciamento de Livros:** Cadastro de livros com título, autor e upload de capa.
*   **Controle de Estoque:** Entrada e saída de estoque, com validações para impedir estoque negativo.
*   **Movimentação em Lote:** Seleção de múltiplos livros para entrada ou saída simultânea em lote.
*   **Histórico e Relatórios:** Registro automático de todas as movimentações (entradas, saídas, edições, exclusões) contendo data, usuário e motivo.
*   **Filtros e Busca:** Busca em tempo real por título ou autor e filtro rápido para itens com estoque baixo.
*   **Exportação:** Exportação dos dados de estoque atual para formato Excel (`.xls`).
*   **Sincronização:** Suporte a armazenamento compartilhado (via API local) com fallback automático para `localStorage` do navegador caso o backend não esteja disponível.

## 🛠️ Tecnologias Utilizadas

*   **HTML5:** Estruturação semântica da página.
*   **CSS3:** Estilização visual (arquivo `style.css`).
*   **JavaScript (ES6+):** Lógica da aplicação, manipulação do DOM e gerenciamento de estado (arquivo `app.js`).

## 📁 Estrutura do Projeto

```text
book_inventory_advanced/
├── index.html     # Ponto de entrada da aplicação, estrutura da interface
├── app.js         # Lógica de negócio, manipulação de estado e eventos
├── style.css      # Regras de estilização e layout
├── .gitignore     # Configurações do Git
└── .vercel/       # Configurações de deploy (se aplicável)
```

## 💻 Como executar o projeto localmente

1.  Como este projeto utiliza apenas tecnologias front-end nativas, você não precisa instalar nenhuma dependência (como Node.js ou npm).
2.  Para abrir o projeto, basta rodar um servidor HTTP simples na pasta do projeto ou usar a extensão "Live Server" do VS Code.
    *   *Exemplo usando Python:* `python -m http.server 8000`
    *   *Exemplo usando npx:* `npx serve .`
3.  Acesse `http://localhost:8000` (ou a porta correspondente) no seu navegador.
    *   *Nota:* Como há uso de módulos ou requisições `fetch` (para simular a API de estado), abrir o arquivo `index.html` diretamente (via `file:///`) pode causar bloqueios de CORS, portanto, o uso de um servidor local é recomendado.

## 👥 Gerenciamento de Estado

O sistema tenta se conectar a um endpoint `/api/state` para persistir os dados (livros, logs e usuários). Caso a API não esteja acessível, ele possui um mecanismo de tolerância a falhas que avisa o usuário e passa a utilizar o `localStorage` do navegador como backup, garantindo que o aplicativo continue funcional.
