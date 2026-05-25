# Estoque de Livros

Sistema web para gerenciamento de estoque de livros, com cadastro, capas, busca, movimentacoes, relatorios e persistencia compartilhada via Vercel + Upstash Redis.

Aplicacao principal: hospedada na Vercel, com link compartilhado apenas diretamente.


## Funcionalidades

- Login simples por nome de usuario.
- Cadastro de livros com titulo, autor e imagem de capa.
- Busca por titulo ou autor.
- Filtro de livros com estoque baixo.
- Entrada e saida individual de estoque.
- Entrada e saida em lote para livros selecionados.
- Bloqueio de saidas que deixariam o estoque negativo.
- Edicao de titulo e autor.
- Atualizacao de capa.
- Exclusao de livros.
- Relatorio de movimentacoes com data, usuario, livro, tipo, quantidade e motivo.
- Controle simples de usuarios.
- Exportacao do estoque para Excel (`.xls`).
- Dados compartilhados entre usuarios por meio de API serverless e Redis.

## Tecnologias

- HTML, CSS e JavaScript vanilla.
- Vercel para hospedagem e funcoes serverless.
- Upstash Redis para persistencia compartilhada.
- `@upstash/redis` para acesso ao banco na API.

## Estrutura

```text
.
|-- api/
|   `-- state.js          # API Vercel para ler e salvar o estado compartilhado
|-- docs/                 # Versao simples para GitHub Pages
|-- app.js                # Logica da aplicacao e integracao com a API
|-- index.html            # Interface principal
|-- style.css             # Estilos da aplicacao
|-- package.json          # Dependencias e scripts
|-- package-lock.json
`-- README.md
```

## Como Rodar Localmente

Instale as dependencias:

```bash
npm install
```

Rode com o ambiente da Vercel:

```bash
npx vercel dev
```

Depois acesse a URL local exibida no terminal.

Para usar o banco compartilhado localmente, e necessario ter as variaveis da Vercel em `.env.local`. Elas sao geradas com:

```bash
npx vercel env pull .env.local
```

O arquivo `.env.local` nao deve ser commitado.

## Persistencia Compartilhada

O app tenta carregar e salvar os dados em `/api/state`. Essa API usa Upstash Redis para manter um unico estado compartilhado contendo:

- livros;
- movimentacoes;
- usuarios.

Se a API ou o banco nao estiverem disponiveis, o app usa `localStorage` como fallback temporario para continuar funcionando no navegador.

## Deploy

O deploy de producao pode ser feito com:

```bash
npx vercel --prod
```

O projeto ja esta conectado ao repositorio:

https://github.com/TheCarlosRamos/estoque

## GitHub Pages

A pasta `docs/` contem uma versao simples da aplicacao para GitHub Pages. Ela salva os dados apenas no `localStorage` do navegador e nao usa o banco compartilhado da Vercel.

Configuracao recomendada no GitHub:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/docs`

Assim, o GitHub Pages publica uma demonstracao simples, enquanto a aplicacao principal com persistencia compartilhada continua rodando separadamente na Vercel.

## Observacoes

- O controle de usuarios atual e simples e nao possui senha/autenticacao real.
- As imagens de capa sao armazenadas junto ao estado como Data URL; para uso maior, o ideal seria mover as imagens para um armazenamento de arquivos, como Vercel Blob.
- O plano gratuito do Upstash Redis possui limites de uso. Para este projeto pequeno, ele deve ser suficiente.
