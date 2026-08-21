# DOCUMENTAÇÃO DO SISTEMA — CONTROLE DE CARGA/DEVOLUÇÃO DE VIATURA

> Documento de engenharia para construir, do zero, um sistema web **mobile-first** de registro de
> "carga de viatura" (checklist das condições do veículo no momento em que um policial assume a
> posse da viatura). O documento foi gerado a partir da análise completa do projeto atual
> `plakinha_bkp`, reutilizando a mesma stack tecnológica — apenas o visual/domínio muda.

---

## SUMÁRIO

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Análise do Projeto Atual (plakinha_bkp)](#2-análise-do-projeto-atual-plakinha_bkp)
3. [Stack Tecnológica (reaproveitada)](#3-stack-tecnológica-reaproveitada)
4. [Requisitos do Novo Sistema](#4-requisitos-do-novo-sistema)
5. [Decisões de Arquitetura](#5-decisões-de-arquitetura)
6. [Modelagem de Dados (MongoDB)](#6-modelagem-de-dados-mongodb)
7. [Estrutura do Projeto (pastas)](#7-estrutura-do-projeto-pastas)
8. [Passo a Passo de Construção (comandos)](#8-passo-a-passo-de-construção-comandos)
9. [Referência de Implementação (arquivos-chave)](#9-referência-de-implementação-arquivos-chave)
10. [Testes](#10-testes)
11. [Deploy e Produção](#11-deploy-e-produção)
12. [Ideias de Implementações Futuras](#12-ideias-de-implementações-futuras)
13. [Checklist Final de Verificação](#13-checklist-final-de-verificação)

---

## 1. VISÃO GERAL DO PROJETO

**Nome sugerido:** `viatura-app` / "Controle de Carga de Viatura"

**Objetivo:** Permitir que um policial, ao **carregar** (assumir a posse de) uma viatura, registre
via navegador web (celular) um checklist completo das condições do veículo, anexe 5 fotos e envie
o registro para um banco MongoDB. O acesso ao formulário é público (sem login). Existe uma segunda
área de **administração** (inicialmente acessada por link próprio) para visualizar/gerenciar os
registros enviados.

**Público-alvo:** Policiais militares em serviço, usando quase exclusivamente **smartphones**.

**Características essenciais:**

- Web, **sem instalação** pelo usuário (não é app nativo).
- **Mobile-first**: telas e componentes desenhados para celular, com aperfeiçoamento progressivo para desktop.
- **Sem login** na fase inicial — o link principal (`/`) já abre o formulário.
- Submissão grava no **MongoDB** (dados + fotos).
- Área administrativa (`/admin`) acessível inicialmente por **link direto**; no futuro, restrita a usuários com role `admin` (como no sistema atual).
- **PWA** (instalável, offline parcial, ícone na home do celular).

---

## 2. ANÁLISE DO PROJETO ATUAL (plakinha_bkp)

Análise feita no repositório `plakinha_bkp`. O novo projeto reutilizará a mesma arquitetura, bibliotecas
e padrões de código, mudando apenas o domínio (consulta veicular → checklist de viatura) e o visual.

### 2.1 Stack utilizada no projeto atual

| Camada | Tecnologia | Versão usada |
|---|---|---|
| Framework | **Next.js (App Router)** | `14.2.x` |
| Linguagem | **TypeScript** | `^5` |
| Banco de dados | **MongoDB** (driver nativo `mongodb`) | `latest` |
| Estilização | **Tailwind CSS** | `3.4.x` |
| Componentes UI | **shadcn/ui** + Radix UI | `latest` |
| Ícones | **lucide-react** | `0.454.x` |
| Formulários | React Hook Form + Zod (disponível) e/ou Server Actions com `useFormState` | `7.54.x` / `3.24.x` |
| Autenticação | `jsonwebtoken` + `bcryptjs` (cookie httpOnly) | `latest` |
| Toasts | **sonner** | `1.7.x` |
| Datas | **date-fns** (locale ptBR) | `latest` |
| Tema | **next-themes** (dark/light) | `latest` |
| PWA | **next-pwa** | `5.6.0` |
| Server state | Server Actions (`'use server'`) | nativo Next 14 |
| Node / npm | Node `22.x` / npm `11.x` | ambiente atual |

### 2.2 Padrões de código identificados (a replicar)

1. **Server Actions** em `actions/*.ts` com diretiva `'use server'` — a regra de negócio e o acesso ao
   banco ficam no servidor. Ex.: `actions/auth-actions.ts`, `actions/vehicle-actions.ts`.
2. **Acesso a dados** centralizado em `lib/*.ts` (ex.: `lib/mongodb.ts` expõe `connectToDatabase()`).
3. **Convenção de pastas**:
   - `app/` → rotas (App Router), `app/api/*/route.ts` para endpoints.
   - `components/ui/` → componentes shadcn genéricos.
   - `components/app/` → componentes de negócio da aplicação.
   - `lib/` → utilitários, conexão com banco, helpers.
   - `actions/` → Server Actions.
   - `hooks/` → hooks customizados (ex.: `use-media-query`).
   - `scripts/` → scripts de automação (ex.: seed de admin).
4. **Mobile-first** com Tailwind: estilos base sem prefixo para mobile e `sm/md/lg` para desktop.
5. **Padrão Drawer vs Dialog**: em mobile usam `Drawer` (abre de baixo) e em desktop `Dialog`/`AlertDialog`,
   escolhidos via hook `useMediaQuery("(min-width: 768px)")` — ver `app/(main)/history/page.tsx`.
6. **Bottom navigation** no mobile (barra fixa inferior) e **Sidebar** no desktop — ver `components/app/Sidebar.tsx`.
7. **Formulários** com `useFormState` + `useFormStatus` (`react-dom`) para botões com loading (`Loader2`).
8. **Feedback** ao usuário via toasts (`sonner`) e `Alert` para erros.
9. **PWA** configurado via `next-pwa` no `next.config.mjs` + `public/manifest.json`.
10. **Alias de importação** `@/*` (configurado no `tsconfig.json`).
11. **.env.local** com variáveis consumidas via `process.env` (ex.: `MONGODB_URI`, `JWT_SECRET`).

### 2.3 O que será REUTILIZADO no novo projeto

- `lib/mongodb.ts` (conexão única com MongoDB — com nome do banco alterado).
- `lib/utils.ts` (`cn`, formatações).
- `hooks/use-media-query.tsx`.
- Componentes shadcn já presentes: `button, card, input, label, textarea, select, radio-group,
  checkbox, badge, separator, sonner, alert, alert-dialog, drawer, dialog, sheet, table,
  scroll-area, skeleton, switch`.
- Padrão PWA (`next.config.mjs` + `manifest.json` + `sw.js` gerado).
- Padrão de admin com role (para a fase 2 de autenticação): `lib/auth.ts`, `lib/jwt.ts`,
  `context/AuthContext.tsx`, `components/app/Sidebar.tsx` (menu condicional por role).

### 2.4 O que NÃO será aproveitado

- Integração com Mercado Pago / créditos / pagamentos (fora de escopo).
- API externa de consulta veicular (Detran).
- Telas de login/recuperação de senha (fase inicial — sem login).
- Middleware de proteção global de rotas (será removido ou restrito ao `/admin`).

---

## 3. STACK TECNOLÓGICA (REAPROVEITADA)

Decisão: **manter exatamente a mesma stack** do projeto atual, alterando apenas o visual.

- **Next.js 14** (App Router) + **TypeScript**
- **MongoDB** via driver oficial (`mongodb`) — com **GridFS** para fotos
- **Tailwind CSS 3.4** + **shadcn/ui** + **Radix UI** + **lucide-react**
- **Server Actions** para toda a lógica de escrita/leitura
- **sonner** para toasts, **date-fns** para datas, **next-themes** para dark mode
- **next-pwa** para tornar o sistema instalável no celular
- **Zod** para validação de entrada no servidor
- **bcryptjs + jsonwebtoken** (instalados já na fase 1, usados na fase 2 de autenticação admin)

> **Por que não React Native / PWA nativo?** O requisito é ser **web sem instalação**. Next.js + PWA
> entrega app-like no celular (ícone na home, tela cheia, cache offline) sem exigir instalação.

---

## 4. REQUISITOS DO NOVO SISTEMA

### 4.1 Requisitos Funcionais

**RF-01 — Tela principal = formulário de carga**
Ao acessar `/` (link principal), o usuário vê imediatamente o formulário de preenchimento. Não há login.

**RF-02 — Identificação da viatura**
- Campo obrigatório: **Placa ou Prefixo da Viatura** (aceitar formato antigo `ABC-1234`, Mercosul
  `ABC1D23` ou prefixo numérico/alfanumérico de frotas).

**RF-03 — Identificação dos policiais**
- Policial que está **realizando a carga** (responsável pelo preenchimento): Patente + Nome.
- Policial que **entregou** a viatura: Patente + Nome.
- Policial que **recebeu** a viatura: Patente + Nome.
- **Matrícula** (obrigatória, do responsável pela carga; opcional para os demais).

**RF-04 — Kilometragem**
- Campos obrigatórios: **Kilometragem inicial** e **Kilometragem final** do veículo (numéricos).
- Validação: final ≥ inicial.

**RF-05 — Checklist de verificação (7 itens)**
Cada item com seleção **"OK"** ou **"Com Alteração"**:

1. Óleo do Motor
2. Arrefecimento
3. Condições dos Pneus
4. Partida e Funcionamento do Motor
5. Freios
6. Identificação Visual
7. Limpeza

**RF-06 — Observações por item (opcional)**
Quando um item está "Com Alteração", exibir campo de texto para descrever a alteração.

**RF-07 — Outras informações pertinentes**
Campo de texto livre: "Outras Informações Pertinentes não Relacionadas aos outros Itens de Verificação Listados".

**RF-08 — Envio de 5 fotos**
Fotos obrigatórias: **Frente, Fundo, Lateral Esquerda, Lateral Direita e Painel do Veículo**.
- No celular, abrir a câmera (`capture="environment"`).
- Permitir também escolher da galeria.
- Pré-visualização antes do envio.

**RF-09 — Persistência**
Ao submeter, gravar no MongoDB um documento com todos os dados + referências das fotos (GridFS).
- Confirmação por toast + tela de sucesso/resumo.
- Sem autenticação na fase inicial.

**RF-10 — Tela de administração**
- Rota `/admin`, acessível **somente pelo link direto** na fase inicial (sem login).
- Lista todos os registros enviados (tabela em desktop, cards em mobile).
- Busca/filtro por placa, nome ou data.
- Visualização do detalhe completo (dados + checklist + fotos em galeria).
- Exclusão de registro (com confirmação).
- Exportação CSV (opcional, fase 1.5).

**RF-11 — Fase futura — autenticação por roles**
- `/admin` restrito a usuários com role `admin` (JWT), replicando `lib/auth.ts` + `lib/jwt.ts` + middleware do projeto atual.
- Novos admins criados via script de seed (`scripts/seed-admin.mjs`).

### 4.2 Requisitos Não Funcionais

| Código | Requisito | Detalhe |
|---|---|---|
| RNF-01 | **Mobile-first** | Layout fluido; alvos de toque ≥ 44–48px; teclados corretos por tipo de input (`number`, `text`); bottom navigation quando houver navegação. |
| RNF-02 | **Web, sem instalação** | Funciona em qualquer navegador moderno; PWA apenas como melhoria (ícone na home). |
| RNF-03 | **Performance** | Tamanho de bundle pequeno; fotos comprimidas no cliente (alvo ~200–400KB cada); imagens com lazy loading. |
| RNF-04 | **Segurança** | Validação de entrada no servidor (Zod); limite de tamanho/tipo de arquivo; proteção contra abuso do formulário público (rate limit opcional); fotos servidas apenas via API interna. |
| RNF-05 | **Disponibilidade do banco** | Conexão MongoDB em singleton; tratamento de erro amigável quando o banco estiver indisponível. |
| RNF-06 | **Acessibilidade** | Labels em todos os campos; contraste adequado; navegação por teclado em desktop. |
| RNF-07 | **PT-BR** | Toda interface em português brasileiro; datas com `date-fns/locale/ptBR`. |
| RNF-08 | **Escalabilidade inicial** | Volume baixo (dezenas/centenas de registros por dia). Estrutura preparada para crescer (índices, paginação). |

### 4.3 Regras de negócio

1. Placa/prefixo obrigatório, normalizado em maiúsculas (remover caracteres especiais).
2. Kilometragem final não pode ser menor que a inicial.
3. Todos os 7 itens do checklist devem ter status preenchido.
4. As 5 fotos são obrigatórias.
5. "Com Alteração" exige observação? (Decisão do cliente — recomendado: exigir, mas configurável.)
6. Registro é imutável após submissão (auditoria); edição apenas por admin (futuro).
7. No futuro: somente role `admin` acessa `/admin`.

---

## 5. DECISÕES DE ARQUITETURA

### 5.1 Roteamento / Páginas

| Rota | Tipo | Descrição |
|---|---|---|
| `/` | Página (Server + Client) | Formulário público de carga de viatura |
| `/sucesso` | Página | Confirmação/resumo após submissão (ou modal na própria `/`) |
| `/admin` | Página (Server + Client) | Listagem e gestão dos registros |
| `/admin/[id]` | Página (Server + Client) | Detalhe do registro com fotos |
| `/api/photos/[id]` | Route Handler | Servir imagem do GridFS (com cache) |
| `/api/export` (opcional) | Route Handler | Exportar CSV dos registros |

- **Sem middleware global** na fase inicial (diferente do projeto atual). Quando a autenticação entrar,
  criar `middleware.ts` protegendo apenas `/admin` (e redirecionando usuários sem role admin).

### 5.2 Autenticação — fases

- **Fase 1 (agora):** sem login. `/admin` é pública por link. Recomenda-se já instalar `bcryptjs` e
  `jsonwebtoken` (mesmas libs) para a fase 2.
  - *Atenção (segurança):* deixar o `/admin` aberto significa que quem souber o link enxerga os dados.
    Mitigação leve opcional já na fase 1: variável `ADMIN_ACCESS_KEY` exigida em uma tela de PIN no
    `/admin`. Recomendado implementar, mas segue a decisão do cliente (link único) como padrão.
- **Fase 2 (futuro):** login com CPF/senha (ou matrícula) + JWT + cookie httpOnly + roles
  `admin`/`user`, exatamente como `lib/auth.ts` + `lib/jwt.ts` + `middleware.ts` do projeto atual.

### 5.3 Armazenamento de fotos — DECISÃO

**Pergunta do cliente:** "É possível armazenar as imagens também no banco de dados?"

**Resposta: SIM.** O driver nativo `mongodb` oferece **GridFS**, que armazena arquivos no próprio
MongoDB em chunks de 255KB (contornando o limite de 16MB por documento). Recomenda-se **GridFS**
para este projeto.

**Por que GridFS e não Base64 no documento?**
- Documentos com Base64 têm limite de 16MB; 5 fotos podem estourar ou inchar o documento.
- GridFS permite streaming e leitura individual de cada foto (sem carregar o registro inteiro).
- Fotos ficam com metadados (contentType, filename) separados dos dados do checklist.

**Alternativas viáveis (caso não queira fotos no banco):**

| Opção | Prós | Contras |
|---|---|---|
| **GridFS no MongoDB (RECOMENDADA)** | Nada externo; dados+imagens no mesmo lugar; simples de servir via `/api/photos/[id]` | Volume em bytes no banco; backup do banco cresce |
| **Base64 comprimido no documento** | Mais simples ainda (sem GridFS, sem API extra) | Limite de 16MB/doc; sem streaming; +33% de overhead |
| **Object storage (S3, Cloudflare R2, GCS)** | Melhor para escala; CDN; sem peso no banco | Serviço externo, chaves, custo |
| **Supabase Storage / Vercel Blob** | Fácil, gratuito para volume baixo | Dependência externa |

**Recomendação final:** GridFS + **compressão/redimensionamento no cliente** (canvas) para cada foto
ficar em ~200–400KB. Isso mantém o total da submissão abaixo dos limites de body dos ambientes
serverless (ex.: Vercel ~4.5MB) e do tamanho prático do banco.

> Se no futuro o volume crescer muito, a migração para R2/S3 é direta: basta trocar `lib/gridfs.ts`
> por chamadas ao serviço e armazenar as URLs no documento.

### 5.4 Fluxo de submissão (com fotos)

```
Celular (client)
  │  1. Usuário preenche formulário + captura 5 fotos (câmera)
  │  2. Cliente comprime cada foto (canvas) → File/Blob pequeno
  │  3. Cliente monta FormData e chama a Server Action (submissão)
  ▼
Server Action (servidor Node)
  │  4. Valida com Zod (dados + arquivos)
  │  5. Para cada foto: lê bytes → GridFS upload → retorna ObjectId
  │  6. Grava documento do checklist com os IDs das fotos
  ▼
MongoDB
  ├── collection `handovers`           (dados do checklist)
  └── bucket GridFS `photos`           (fotos → collections photos.files / photos.chunks)
```

### 5.5 Segurança do formulário público

- Validar tudo no servidor com **Zod** (nunca confiar no cliente).
- Fotos: validar tipo MIME (`image/jpeg`, `image/png`, `image/webp`) e tamanho máximo (ex.: 2MB por foto).
- Servir fotos apenas pela API interna (`/api/photos/[id]`), nunca por URL pública arbitrária.
- Opcional fase 1: rate limit simples (middleware ou `Upstash Ratelimit`) e `honeypot` no formulário.

---

## 6. MODELAGEM DE DADOS (MONGODB)

**Banco de dados:** `viatura`

### 6.1 Coleção `handovers` — registro de carga

```js
{
  _id: ObjectId,
  plate: "ABC1D23",                    // obrigatório, normalizado (maiúsculas, sem -)
  officer: {                           // policial que realizou a carga
    patente: "Sd",
    nome: "João da Silva",
    matricula: "123456"
  },
  deliveringOfficer: {                 // entregou a viatura
    patente: "Sgt",
    nome: "Maria Souza",
    matricula: "654321"
  },
  receivingOfficer: {                  // recebeu a viatura
    patente: "Sd",
    nome: "João da Silva",
    matricula: "123456"
  },
  kilometers: {
    initial: 45210,                    // obrigatório, número inteiro
    final: 45210                       // obrigatório, ≥ initial
  },
  checklist: {
    oleo_motor:             "ok" | "alteracao",
    arrefecimento:          "ok" | "alteracao",
    pneus:                  "ok" | "alteracao",
    partida_motor:          "ok" | "alteracao",
    freios:                 "ok" | "alteracao",
    identificacao_visual:   "ok" | "alteracao",
    limpeza:                "ok" | "alteracao"
  },
  checklistObservations: {
    oleo_motor: "Nível do óleo abaixo do mínimo",   // só quando status = "alteracao"
    // ... demais itens com alteração
  },
  observations: "Outras informações pertinentes...",  // texto livre
  photos: {
    frente:          "64f9...ObjectIdGridFS",
    fundo:           "64f9...ObjectIdGridFS",
    lateral_esquerda:"64f9...ObjectIdGridFS",
    lateral_direita: "64f9...ObjectIdGridFS",
    painel:          "64f9...ObjectIdGridFS"
  },
  createdAt: ISODate("2026-08-19T10:00:00Z"),
  updatedAt: ISODate("2026-08-19T10:00:00Z")
}
```

**Índices recomendados:**

```js
db.handovers.createIndex({ createdAt: -1 })      // listagem admin (mais recentes primeiro)
db.handovers.createIndex({ plate: 1 })           // busca por placa
db.handovers.createIndex({ 'officer.nome': 1 })  // busca por nome (futuro)
```

### 6.2 GridFS — bucket `photos`

Gerado automaticamente pelo driver:

- `photos.files` — metadados (`filename`, `contentType`, `length`, `uploadDate`, `metadata`).
- `photos.chunks` — blocos binários de 255KB.

> Tamanho estimado por registro: 5 fotos × ~250KB ≈ 1,25MB (mais o documento do checklist).

### 6.3 Coleção `users` (FASE FUTURA — autenticação)

Replicar o schema do projeto atual (`lib/auth.ts`):

```js
{
  _id: ObjectId,
  cpf: "06468856507",          // ou matricula
  name: "Nome",
  email: "email@exemplo.com",
  role: "admin" | "user",
  credits: 0,
  password: "<hash bcrypt>",   // opcional na fase 1
  isActive: true,
  createdAt: Date,
  lastLogin: Date,
  passwordResetRequested: false
}
```

---

## 7. ESTRUTURA DO PROJETO (pastas)

```
viatura-app/
├── .env.local                 # variáveis de ambiente (NÃO versionar)
├── .gitignore
├── next.config.mjs            # PWA config
├── package.json
├── tsconfig.json              # alias @/*
├── tailwind.config.ts
├── components.json            # shadcn config
├── actions/
│   └── handover-actions.ts    # Server Actions (submit, list, delete, get)
├── app/
│   ├── layout.tsx             # layout raiz (fontes, theme, Toaster, PWA metas)
│   ├── globals.css            # Tailwind + variáveis CSS
│   ├── page.tsx               # /  → FORMULÁRIO público de carga
│   ├── sucesso/
│   │   └── page.tsx           # /sucesso → confirmação
│   ├── admin/
│   │   ├── page.tsx           # /admin → listagem
│   │   └── [id]/
│   │       └── page.tsx       # /admin/[id] → detalhe com fotos
│   └── api/
│       └── photos/[id]/
│           └── route.ts       # /api/photos/[id] → serve imagem do GridFS
├── components/
│   ├── ui/                    # shadcn (button, card, input, ...)
│   └── app/
│       ├── HandoverForm.tsx   # formulário completo (client)
│       ├── PhotoCapture.tsx   # captura de foto (câmera/galeria)
│       ├── ChecklistItem.tsx  # item do checklist (OK / Com Alteração)
│       ├── HandoverTable.tsx  # tabela admin (desktop)
│       ├── HandoverCard.tsx   # card admin (mobile)
│       └── HandoverDetail.tsx # detalhe do registro
├── hooks/
│   └── use-media-query.tsx
├── lib/
│   ├── mongodb.ts             # conexão singleton
│   ├── gridfs.ts              # upload/leitura/delete de fotos
│   ├── validation.ts          # schemas Zod
│   └── utils.ts               # cn() + formatações
├── public/
│   ├── manifest.json
│   ├── sw.js                  # gerado pelo next-pwa em build
│   └── (ícones/logo)
└── scripts/
    └── seed-admin.mjs         # (fase futura) cria admin
```

---

## 8. PASSO A PASSO DE CONSTRUÇÃO (COMANDOS)

### Etapa 0 — Pré-requisitos

```bash
node --version   # >= 20 (recomendado: 22.x, igual ao ambiente atual)
npm --version    # >= 10
# Conta MongoDB Atlas (ou MongoDB local/Docker) com a string de conexão pronta
# Editor: VS Code (opcional)
```

### Etapa 1 — Criar o projeto Next.js 14

```bash
npx create-next-app@14 viatura-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-npm

cd viatura-app
```

### Etapa 2 — Instalar dependências

```bash
# Core do backend + utilidades
npm install mongodb jsonwebtoken bcryptjs zod date-fns clsx tailwind-merge class-variance-authority

# UI / ícones / toasts / tema
npm install lucide-react sonner next-themes

# PWA
npm install next-pwa
```

> As versões serão as mesmas resolvidas no projeto atual (`mongodb`, `jsonwebtoken`, `bcryptjs`,
> `date-fns`, `lucide-react`, `sonner`, `next-themes`, `next-pwa` — todas com `latest` ou versões
> compatíveis com Next 14 / React 18).

### Etapa 3 — Configurar shadcn/ui

```bash
npx shadcn@latest init
# Escolher: base color = Neutral | CSS variables = yes

# Adicionar os componentes necessários
npx shadcn@latest add button card input label textarea select radio-group checkbox badge \
  separator sonner alert alert-dialog dialog drawer sheet table scroll-area skeleton switch
```

### Etapa 4 — Configurações básicas

**4.1 `next.config.mjs` (PWA)** — igual ao projeto atual:

```js
import withPWA from "next-pwa";

const nextConfig = {
  images: { unoptimized: true },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
})(nextConfig);
```

**4.2 `app/globals.css`** — copiar o conteúdo do projeto atual (`app/globals.css`), mantendo as
variáveis HSL do shadcn (ajustar `--primary` para a cor institucional desejada no novo visual).

**4.3 `app/layout.tsx`** — copiar o padrão atual (font Inter, `ThemeProvider`, `<Toaster />`,
metas PWA) e trocar título/descrição.

**4.4 `.env.local`** (criar na raiz):

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/viatura?retryWrites=true&w=majority
# Fase futura (auth admin):
JWT_SECRET=um-segredo-super-secreto-troque-isto
# Opcional fase 1 (PIN simples para /admin):
ADMIN_ACCESS_KEY=chave-secreta-do-admin
# Limites de upload (padrões caso queira sobrescrever)
MAX_PHOTO_SIZE_MB=2
```

**4.5 `tsconfig.json`** — o `create-next-app` já cria o alias `@/*`; confirmar.

**4.6 Remover** `middleware.ts` (não há proteção global na fase 1). Se criado na fase 2, replicar o
`middleware.ts` do projeto atual protegendo apenas `/admin`.

### Etapa 5 — Arquivos de suporte (`lib/`)

Criar:
- `lib/mongodb.ts` (conexão singleton — ver §9.1)
- `lib/gridfs.ts` (upload/leitura/delete — ver §9.2)
- `lib/validation.ts` (schemas Zod — ver §9.3)
- `lib/utils.ts` (copiar `cn()` e formatações úteis do projeto atual)

### Etapa 6 — Server Actions (`actions/handover-actions.ts`)

Criar as ações: `submitHandoverAction`, `getHandoversAction`, `getHandoverByIdAction`,
`deleteHandoverAction`, `exportHandoversCSVAction` (ver §9.4).

### Etapa 7 — Páginas e componentes

Criar a UI (ver §9.5 em diante):
- `app/page.tsx` + `components/app/HandoverForm.tsx` (formulário mobile-first)
- `components/app/PhotoCapture.tsx` (captura de fotos)
- `app/sucesso/page.tsx`
- `app/admin/page.tsx` + `HandoverTable`/`HandoverCard`
- `app/admin/[id]/page.tsx` + `HandoverDetail`
- `app/api/photos/[id]/route.ts`

### Etapa 8 — PWA (manifest + ícones)

Criar `public/manifest.json` (copiar do projeto atual, trocando nome):

```json
{
  "name": "Controle de Viatura",
  "short_name": "Viatura",
  "description": "Checklist de carga de viatura",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000"
}
```

> Gerar `icon-192.png` e `icon-512.png` a partir do logo (ex.: ferramenta online ou `sharp`).

### Etapa 9 — Rodar o projeto

```bash
npm run dev
# Acessar http://localhost:3000
```

**Verificação rápida:**
1. Abrir `/` no celular (ou DevTools mobile) → formulário aparece.
2. Preencher + capturar 5 fotos → submeter → toast de sucesso.
3. Conferir no Atlas/MongoDB a coleção `handovers` e o bucket `photos`.
4. Abrir `/admin` → lista contém o registro → abrir detalhe → fotos carregam via `/api/photos/[id]`.

---

## 9. REFERÊNCIA DE IMPLEMENTAÇÃO (ARQUIVOS-CHAVE)

> Código de referência fiel aos padrões do projeto atual. Ajuste nomes/estilos conforme o visual.

### 9.1 `lib/mongodb.ts`

```ts
// lib/mongodb.ts
import { MongoClient, Db } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise
  const db = client.db('viatura') // NOME DO BANCO
  return { client, db }
}

export default clientPromise
```

### 9.2 `lib/gridfs.ts`

```ts
// lib/gridfs.ts
import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'stream'
import { connectToDatabase } from './mongodb'

export async function uploadPhoto(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  const uploadStream = bucket.openUploadStream(filename, { contentType })
  const id = uploadStream.id

  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(uploadStream)
      .on('finish', () => resolve())
      .on('error', reject)
  })

  return id.toString()
}

export async function getPhoto(id: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!ObjectId.isValid(id)) return null
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  const chunks: Buffer[] = []

  return new Promise((resolve, reject) => {
    bucket
      .openDownloadStream(new ObjectId(id))
      .on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      .on('end', async () => {
        const file = await db.collection('photos.files').findOne({ _id: new ObjectId(id) })
        if (!file) return resolve(null)
        resolve({ buffer: Buffer.concat(chunks), contentType: file.contentType || 'image/jpeg' })
      })
      .on('error', reject)
  })
}

export async function deletePhoto(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  try {
    await bucket.delete(new ObjectId(id))
  } catch {
    // arquivo inexistente — ignora
  }
}
```

### 9.3 `lib/validation.ts` (Zod)

```ts
// lib/validation.ts
import { z } from 'zod'

export const CHECKLIST_ITEMS = [
  { key: 'oleo_motor', label: 'Óleo do Motor' },
  { key: 'arrefecimento', label: 'Arrefecimento' },
  { key: 'pneus', label: 'Condições dos Pneus' },
  { key: 'partida_motor', label: 'Partida e Funcionamento do Motor' },
  { key: 'freios', label: 'Freios' },
  { key: 'identificacao_visual', label: 'Identificação Visual' },
  { key: 'limpeza', label: 'Limpeza' },
] as const

export const PHOTO_KEYS = [
  { key: 'frente', label: 'Frente' },
  { key: 'fundo', label: 'Fundo' },
  { key: 'lateral_esquerda', label: 'Lateral Esquerda' },
  { key: 'lateral_direita', label: 'Lateral Direita' },
  { key: 'painel', label: 'Painel do Veículo' },
] as const

const statusSchema = z.enum(['ok', 'alteracao'])

export const handoverSchema = z.object({
  plate: z.string().trim().min(3, 'Placa/prefixo obrigatório').max(15),
  officer: z.object({
    patente: z.string().trim().min(1, 'Patente obrigatória').max(30),
    nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
    matricula: z.string().trim().min(1, 'Matrícula obrigatória').max(20),
  }),
  deliveringOfficer: z.object({
    patente: z.string().trim().min(1, 'Patente obrigatória').max(30),
    nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
    matricula: z.string().trim().max(20).optional().or(z.literal('')),
  }),
  receivingOfficer: z.object({
    patente: z.string().trim().min(1, 'Patente obrigatória').max(30),
    nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
    matricula: z.string().trim().max(20).optional().or(z.literal('')),
  }),
  kilometers: z
    .object({
      initial: z.coerce.number().int().min(0, 'Kilometragem inicial inválida'),
      final: z.coerce.number().int().min(0, 'Kilometragem final inválida'),
    })
    .refine((k) => k.final >= k.initial, {
      message: 'Kilometragem final não pode ser menor que a inicial',
      path: ['final'],
    }),
  checklist: z.record(statusSchema),
  checklistObservations: z.record(z.string().trim().max(500)).optional(),
  observations: z.string().trim().max(2000).optional().or(z.literal('')),
})
```

### 9.4 `actions/handover-actions.ts`

```ts
// actions/handover-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/mongodb'
import { uploadPhoto, deletePhoto } from '@/lib/gridfs'
import { handoverSchema, PHOTO_KEYS } from '@/lib/validation'
import { ObjectId } from 'mongodb'

const MAX_PHOTO_SIZE = (parseInt(process.env.MAX_PHOTO_SIZE_MB || '2') || 2) * 1024 * 1024

export async function submitHandoverAction(formData: FormData) {
  try {
    const plate = (formData.get('plate') as string || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()

    const raw = {
      plate,
      officer: {
        patente: formData.get('officer_patente'),
        nome: formData.get('officer_nome'),
        matricula: formData.get('officer_matricula'),
      },
      deliveringOfficer: {
        patente: formData.get('delivered_patente'),
        nome: formData.get('delivered_nome'),
        matricula: formData.get('delivered_matricula'),
      },
      receivingOfficer: {
        patente: formData.get('received_patente'),
        nome: formData.get('received_nome'),
        matricula: formData.get('received_matricula'),
      },
      kilometers: {
        initial: formData.get('km_initial'),
        final: formData.get('km_final'),
      },
      checklist: {},
      checklistObservations: {},
      observations: formData.get('observations'),
    }

    for (const item of ['oleo_motor', 'arrefecimento', 'pneus', 'partida_motor', 'freios', 'identificacao_visual', 'limpeza']) {
      const status = formData.get(`check_${item}`)
      if (status !== 'ok' && status !== 'alteracao') {
        return { error: `Status inválido para o item ${item}` }
      }
      raw.checklist[item] = status
      if (status === 'alteracao') {
        raw.checklistObservations[item] = formData.get(`obs_${item}`) || ''
      }
    }

    const parsed = handoverSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    // Fotos: upload para GridFS
    const photoIds: Record<string, string> = {}
    for (const { key } of PHOTO_KEYS) {
      const file = formData.get(`photo_${key}`) as File | null
      if (!file || !file.size) return { error: `Foto "${key}" é obrigatória` }

      if (file.size > MAX_PHOTO_SIZE) {
        return { error: `Foto "${key}" excede o tamanho máximo de ${MAX_PHOTO_SIZE / 1024 / 1024}MB` }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const id = await uploadPhoto(buffer, `${plate}_${key}.jpg`, file.type || 'image/jpeg')
      photoIds[key] = id
    }

    const { db } = await connectToDatabase()
    const now = new Date()
    const result = await db.collection('handovers').insertOne({
      ...parsed.data,
      checklistObservations: parsed.data.checklistObservations || {},
      photos: photoIds,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath('/admin')
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error('Erro ao salvar carga de viatura:', error)
    return { error: 'Erro ao salvar. Tente novamente.' }
  }
}

export async function getHandoversAction(query = '') {
  try {
    const { db } = await connectToDatabase()
    const filter = query
      ? {
          $or: [
            { plate: { $regex: query, $options: 'i' } },
            { 'officer.nome': { $regex: query, $options: 'i' } },
          ],
        }
      : {}
    const docs = await db
      .collection('handovers')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    return {
      success: true,
      records: docs.map((d) => ({
        _id: d._id.toString(),
        plate: d.plate,
        officer: d.officer,
        kilometers: d.kilometers,
        createdAt: d.createdAt,
        hasAlteration: Object.values(d.checklist).includes('alteracao'),
      })),
    }
  } catch (error) {
    console.error('Erro ao listar registros:', error)
    return { error: 'Erro ao listar registros' }
  }
}

export async function getHandoverByIdAction(id: string) {
  try {
    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }
    return { success: true, record: { ...doc, _id: doc._id.toString() } }
  } catch (error) {
    console.error('Erro ao buscar registro:', error)
    return { error: 'Erro ao buscar registro' }
  }
}

export async function deleteHandoverAction(id: string) {
  try {
    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }

    for (const key of PHOTO_KEYS) {
      const pid = doc.photos?.[key.key]
      if (pid) await deletePhoto(pid)
    }

    await db.collection('handovers').deleteOne({ _id: new ObjectId(id) })
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir registro:', error)
    return { error: 'Erro ao excluir registro' }
  }
}
```

### 9.5 `app/api/photos/[id]/route.ts`

```ts
// app/api/photos/[id]/route.ts
import { NextResponse } from 'next/server'
import { getPhoto } from '@/lib/gridfs'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const photo = await getPhoto(params.id)
  if (!photo) {
    return new NextResponse('Foto não encontrada', { status: 404 })
  }
  return new NextResponse(new Uint8Array(photo.buffer), {
    headers: {
      'Content-Type': photo.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
```

### 9.6 `components/app/PhotoCapture.tsx` (captura mobile-first)

```tsx
// components/app/PhotoCapture.tsx
'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: File | null
  preview: string | null
  onChange: (file: File | null) => void
}

export function PhotoCapture({ label, value, preview, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-center',
        value ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="max-h-40 rounded-md object-contain" />
      ) : (
        <>
          <Camera className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">Toque para tirar foto</span>
        </>
      )}
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange(null)
          }}
          className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-white"
        >
          Remover
        </button>
      )}
    </div>
  )
}
```

> **Dica de compressão no cliente (opcional):** redesenhar a foto num `<canvas>` de ~1200px antes de
> enviar, para reduzir o tamanho e caber nos limites de body (ex.: Vercel ~4.5MB). Mantém as fotos
> abaixo de ~300KB cada.

### 9.7 `app/page.tsx` (formulário público) — esqueleto

```tsx
// app/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { submitHandoverAction } from '@/actions/handover-actions'
import { CHECKLIST_ITEMS, PHOTO_KEYS } from '@/lib/validation'
import { PhotoCapture } from '@/components/app/PhotoCapture'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const initialState = { success: false, error: undefined, id: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="sticky bottom-4 w-full" disabled={pending}>
      {pending ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
      ) : (
        <><Send className="mr-2 h-4 w-4" /> Enviar Registro</>
      )}
    </Button>
  )
}

export default function HomePage() {
  const [state, formAction] = useFormState(submitHandoverAction, initialState)
  const [photos, setPhotos] = useState<Record<string, { file: File | null; preview: string | null }>>(
    Object.fromEntries(PHOTO_KEYS.map((p) => [p.key, { file: null, preview: null }]))
  )
  const router = useRouter()

  const setPhoto = (key: string, file: File | null) => {
    setPhotos((prev) => {
      const cur = prev[key]
      if (cur?.preview) URL.revokeObjectURL(cur.preview)
      return { ...prev, [key]: { file, preview: file ? URL.createObjectURL(file) : null } }
    })
  }

  // No form: anexar arquivos ao FormData antes de submit (onSubmit custom,
  // chamando formAction com FormData já preenchido pelas fotos em state).
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    for (const { key } of PHOTO_KEYS) {
      const f = photos[key].file
      if (f) formData.set(`photo_${key}`, f)
    }
    // uso alternativo: iniciar transição e chamar formAction(formData)
    const fn = formAction as unknown as (fd: FormData) => void
    fn(formData)
  }

  if (state.success) router.push(`/sucesso?id=${state.id}`)
  if (state.error) toast.error(state.error)

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Carga de Viatura</h1>
        <p className="text-muted-foreground">Registre as condições do veículo</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seção 1: Viatura */}
        <Card>
          <CardHeader><CardTitle>Viatura</CardTitle><CardDescription>Placa ou prefixo e kilometragem</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa ou Prefixo *</Label>
              <Input id="plate" name="plate" placeholder="ABC1D23" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="km_initial">Km Inicial *</Label>
                <Input id="km_initial" name="km_initial" type="number" inputMode="numeric" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="km_final">Km Final *</Label>
                <Input id="km_final" name="km_final" type="number" inputMode="numeric" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Policiais (entregou / recebeu) */}
        <Card>
          <CardHeader><CardTitle>Policiais</CardTitle><CardDescription>Quem entregou e quem recebeu</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <OfficerFields prefix="officer" title="Responsável pela carga" showMatricula />
            <OfficerFields prefix="delivered" title="Entregou a viatura" />
            <OfficerFields prefix="received" title="Recebeu a viatura" />
          </CardContent>
        </Card>

        {/* Seção 3: Checklist */}
        <Card>
          <CardHeader><CardTitle>Verificação da Viatura</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {CHECKLIST_ITEMS.map((item) => (
              <ChecklistItem key={item.key} slug={item.key} label={item.label} />
            ))}
          </CardContent>
        </Card>

        {/* Seção 4: Fotos */}
        <Card>
          <CardHeader><CardTitle>Fotos</CardTitle><CardDescription>5 fotos obrigatórias</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            {PHOTO_KEYS.map((p) => (
              <PhotoCapture
                key={p.key}
                label={p.label}
                value={photos[p.key].file}
                preview={photos[p.key].preview}
                onChange={(f) => setPhoto(p.key, f)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Seção 5: Observações */}
        <Card>
          <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              name="observations"
              rows={4}
              placeholder="Outras informações pertinentes não relacionadas aos itens listados..."
            />
          </CardContent>
        </Card>

        <SubmitButton />
      </form>
    </div>
  )
}
```

> Subcomponentes `OfficerFields` (3 inputs: patente, nome, matrícula) e `ChecklistItem` (radio
> "OK"/"Com Alteração" + textarea condicional) devem ser criados seguindo o mesmo padrão.

### 9.8 `app/admin/page.tsx` (listagem — esqueleto)

```tsx
// app/admin/page.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getHandoversAction, deleteHandoverAction } from '@/actions/handover-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Search } from 'lucide-react'

interface Record {
  _id: string
  plate: string
  officer: { nome: string; matricula: string }
  kilometers: { initial: number; final: number }
  createdAt: Date
  hasAlteration: boolean
}

export default function AdminPage() {
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const router = useRouter()

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const res = await getHandoversAction(q)
    if (res.error) toast.error(res.error)
    else setRecords(res.records ?? [])
    setLoading(false)
  }, [])

  useState(() => { load(); return undefined })

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return
    const res = await deleteHandoverAction(id)
    if (res.error) toast.error(res.error)
    else { toast.success('Registro excluído'); load(query) }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administração</h1>
        <Button variant="outline" onClick={() => router.push('/')}>Novo Registro</Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por placa ou nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(query)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : records.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum registro.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {records.map((r) => (
            <Card key={r._id} className="cursor-pointer" onClick={() => router.push(`/admin/${r._id}`)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-mono font-semibold">{r.plate}</p>
                  <p className="text-sm text-muted-foreground">{r.officer.nome} · {r.officer.matricula}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Km {r.kilometers.initial}–{r.kilometers.final}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.hasAlteration && <Badge variant="destructive">Com Alteração</Badge>}
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(r._id) }}>
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 9.9 `app/admin/[id]/page.tsx` (detalhe com fotos)

```tsx
// app/admin/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getHandoverByIdAction } from '@/actions/handover-actions'
import { CHECKLIST_ITEMS, PHOTO_KEYS } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function HandoverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getHandoverByIdAction(id).then((res) => {
      if (res.error) router.push('/admin')
      else setRecord(res.record)
      setLoading(false)
    })
  }, [id, router])

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!record) return null

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Button variant="outline" onClick={() => router.push('/admin')}>← Voltar</Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono">{record.plate}</CardTitle>
          <CardDescription>Registro de {new Date(record.createdAt).toLocaleString('pt-BR')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Info label="Responsável" value={`${record.officer.patente} ${record.officer.nome} · ${record.officer.matricula}`} />
            <Info label="Entregou" value={`${record.deliveringOfficer?.patente} ${record.deliveringOfficer?.nome}`} />
            <Info label="Recebeu" value={`${record.receivingOfficer?.patente} ${record.receivingOfficer?.nome}`} />
          </div>
          <Info label="Kilometragem" value={`${record.kilometers.initial} → ${record.kilometers.final}`} />
          {record.observations && <Info label="Outras informações" value={record.observations} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const status = record.checklist?.[item.key]
            return (
              <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  {status === 'alteracao' && record.checklistObservations?.[item.key] && (
                    <p className="text-sm text-destructive">{record.checklistObservations[item.key]}</p>
                  )}
                </div>
                <Badge variant={status === 'ok' ? 'default' : 'destructive'}>
                  {status === 'ok' ? 'OK' : 'Com Alteração'}
                </Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fotos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PHOTO_KEYS.map((p) => {
            const pid = record.photos?.[p.key]
            if (!pid) return null
            return (
              <div key={p.key} className="space-y-1">
                <p className="text-sm font-medium">{p.label}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${pid}`} alt={p.label} className="w-full rounded-lg border object-contain" loading="lazy" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
```

---

## 10. TESTES

Não há suíte no projeto atual; adicionar gradualmente. Sugestões mínimas:

```bash
# Testes unitários (futuro)
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Testes e2e (futuro)
npm install -D @playwright/test
npx playwright install
```

Casos prioritários:
1. Validação do schema (kilometragem final < inicial → erro).
2. Submissão sem as 5 fotos → erro.
3. Upload GridFS + leitura via `/api/photos/[id]`.
4. Fluxo e2e: preencher → capturar → salvar → aparecer no `/admin` → abrir detalhe.
5. Responsividade (Playwright em viewport 375×667 e 1440×900).

---

## 11. DEPLOY E PRODUÇÃO

### 11.1 Opção recomendada: Vercel + MongoDB Atlas

```bash
npm run build          # deve concluir sem erros (gera também public/sw.js do PWA)
npx vercel             # primeiro deploy (ou conectar o repo no painel da Vercel)
```

**Variáveis de ambiente no painel (Vercel → Settings → Environment Variables):**

```
MONGODB_URI   mongodb+srv://<user>:<pass>@<cluster>/viatura?retryWrites=true&w=majority
JWT_SECRET    <fase futura>
ADMIN_ACCESS_KEY  <opcional>
MAX_PHOTO_SIZE_MB 2
```

**Atenções de produção:**
- **Limite de body (Vercel serverless ≈ 4.5MB):** a compressão no cliente das fotos (5 × ~300KB ≈ 1.5MB)
  mantém a submissão segura. Se crescer, migrar fotos para Vercel Blob/S3 e enviar por upload direto
  (presigned URL).
- **Timeout serverless (10s hobby/60s pro):** upload GridFS de 5 fotos pequenas é rápido; OK.
- **Índices:** criar `handovers.createdAt` e `handovers.plate` no Atlas (UI ou `scripts/`).
- **Backup:** habilitar backups no Atlas (fotos inclusas via GridFS).

### 11.2 Alternativas de hospedagem

- **Railway / Render / Fly.io:** mesmo projeto, deploy com `npm run build && npm start`. Sem limite
  rígido de body (ajustável), útil se as fotos forem grandes.
- **VPS (Docker):** rodar `next start` atrás de Nginx/Caddy com HTTPS.
- **MongoDB local/Docker** para dev:
  ```bash
  docker run -d --name mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=viatura mongo:7
  # MONGODB_URI=mongodb://localhost:27017/viatura
  ```

---

## 12. IDEIAS DE IMPLEMENTAÇÕES FUTURAS

### Autenticação e controle de acesso
1. **Login com matrícula/CPF + senha** (JWT, cookie httpOnly) — replicar `lib/auth.ts`/`lib/jwt.ts`.
2. **Controle por roles** (`admin` / `user`): `/admin` restrito a admins (como no projeto atual).
3. **Menu condicional** por role (Sidebar do projeto atual) e seed de admin (`scripts/seed-admin.mjs`).
4. **PIN simples** para o `/admin` já na fase 1 (`ADMIN_ACCESS_KEY`).

### Qualidade e integridade do registro
5. **Assinatura digital** do policial (captura no canvas) anexada ao registro.
6. **Geolocalização** (latitude/longitude) do local da carga/devolução (navigator.geolocation).
7. **Registro de devolução** vinculado à carga (par `handoverId` de referência, km final da carga =
   km inicial da devolução).
8. **Histórico por placa** com busca e linha do tempo de todas as cargas da viatura.
9. **Imutabilidade + trilha de auditoria** (registro de quem alterou/excluiu, timestamps).

### Produtividade do policial
10. **QR Code na viatura** apontando para `/` com placa pré-preenchida (`?plate=ABC1D23`).
11. **Autocomplete de nomes/matrículas** (lista pré-cadastrada de policiais no banco).
12. **Rascunho offline** (PWA + IndexedDB): salvar formulário sem internet e sincronizar depois.
13. **Modo câmera único** para acelerar a captura das 5 fotos (pré-definir ordem).
14. **Atalhos de voz** (Web Speech API) para preencher observações.

### Relatórios e gestão
15. **Exportação PDF** do checklist (relatório oficial com logo, campos e fotos).
16. **Exportação CSV/Excel** com todos os registros (botão no admin).
17. **Dashboard com KPIs** (recharts, já usado no projeto atual): cargas por dia, % de itens com
    alteração, top problemas, frota mais problemática.
18. **Relatórios periódicos** por e-mail para supervisores (CRON + Resend/Nodemailer).
19. **Notificações web push** para supervisores quando houver registro com "Com Alteração".

### Técnica e escala
20. **Compressão/redimensionamento de imagens** no cliente (canvas) e no servidor (`sharp`).
21. **Migração de fotos para S3/R2** quando o volume crescer (mudança isolada em `lib/gridfs.ts`).
22. **Paginação** na listagem admin (atualmente limitada a 200).
23. **Rate limiting e proteção anti-spam** no formulário público (Upstash Ratelimit, CAPTCHA, honeypot).
24. **Testes automatizados** (Vitest + Playwright) e **CI** (GitHub Actions).
25. **Monitoramento de erros** (Sentry) e **logs estruturados**.
26. **Validação de placa** com formato Mercosul completo (`lib/utils.ts` do projeto atual).
27. **Dark mode** via `next-themes` (já configurável) e **tema institucional** customizável.
28. **Multi-idioma** (i18n) se necessário.
29. **Edição por admin** de registros (com auditoria) e correção de digitação.
30. **Integração com API de dados veiculares** (placa → marca/modelo) como o projeto atual, para
    enriquecer o registro.

---

## 13. CHECKLIST FINAL DE VERIFICAÇÃO

- [ ] Projeto criado com `create-next-app@14` (App Router + TS + Tailwind + alias `@/*`).
- [ ] Dependências instaladas (`mongodb`, `zod`, `sonner`, `lucide-react`, `next-pwa`, ...).
- [ ] shadcn/ui inicializado e componentes adicionados.
- [ ] `next.config.mjs` com PWA e `public/manifest.json` criados.
- [ ] `.env.local` com `MONGODB_URI` configurada (banco `viatura`).
- [ ] `lib/mongodb.ts`, `lib/gridfs.ts`, `lib/validation.ts` criados.
- [ ] `actions/handover-actions.ts` com submit/list/get/delete testados.
- [ ] `/` → formulário completo (viatura, policiais, km, checklist, 5 fotos, observações).
- [ ] Fotos capturam pela câmera no celular (`capture="environment"`).
- [ ] Submissão grava no MongoDB + GridFS e mostra toast de sucesso.
- [ ] `/admin` lista registros, busca, detalhe com fotos e exclusão.
- [ ] `/api/photos/[id]` serve as imagens corretamente.
- [ ] `npm run build` sem erros.
- [ ] Testado em viewport mobile (375px) e desktop (1440px).
- [ ] (Fase futura) autenticação + role admin + seed configurados.

---

*Fim da documentação. Gerada a partir da análise do repositório `plakinha_bkp` (Next.js 14 App Router,
TypeScript, MongoDB, Tailwind, shadcn/ui, Server Actions, PWA).*