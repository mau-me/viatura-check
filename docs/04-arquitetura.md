# 04 — Arquitetura

> Documento de arquitetura do sistema `viatura-check`: stack, decisões, estrutura de pastas e
> padrões de código seguidos no projeto.

---

## 1. Stack tecnológica

| Camada | Tecnologia | Versão instalada |
|---|---|---|
| Framework | Next.js (App Router) | `14.2.35` |
| Linguagem | TypeScript | `^5` |
| Banco de dados | MongoDB (driver oficial) | `7.5.0` |
| Estilização | Tailwind CSS | `4.3.3` |
| Componentes UI | shadcn/ui (estilo base-nova) + @base-ui/react | `^4.18.0` / `1.7.0` |
| Ícones | lucide-react | `1.33.0` |
| Validação | Zod | `4.4.3` |
| Datas | date-fns (locale ptBR) | `4.4.0` |
| Toasts | sonner | `2.0.8` |
| Tema | next-themes | `0.4.6` |
| PWA | next-pwa | `5.6.0` |
| Lógica de escrita | Server Actions (`'use server'`) | nativo Next 14 |
| Autenticação (futuro) | jsonwebtoken + bcryptjs | `9.0.3` / `3.0.3` |
| Utilitários | clsx, tailwind-merge, class-variance-authority, tw-animate-css | — |

> **Nota:** as dependências `jsonwebtoken` e `bcryptjs` já estão instaladas, prontas para a fase 2 de
> autenticação (ver [03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md#11-autenticação-com-login)).

---

## 2. Decisões de arquitetura

### 2.1 Roteamento

| Rota | Tipo | Descrição |
|---|---|---|
| `/` | Página (Client) | Formulário público de carga |
| `/sucesso` | Página (Server) | Confirmação após submissão (`?id=...`) |
| `/admin` | Página (Client) | Listagem e gestão dos registros |
| `/admin/[id]` | Página (Client) | Detalhe do registro com fotos |
| `/api/photos/[id]` | Route Handler | Serve imagem do GridFS (com cache) |

- **Sem middleware global** na fase 1. Quando a autenticação entrar, será criado `middleware.ts`
  protegendo apenas `/admin`.

### 2.2 Armazenamento de fotos — GridFS

As fotos são armazenadas **no MongoDB via GridFS** (bucket `photos`), em chunks de 255KB. Isso
contorna o limite de 16MB por documento e permite servir cada foto individualmente via API interna.

- Upload/leitura/delete centralizados em `lib/gridfs.ts`.
- Fotos comprimidas **no cliente** é uma pendência (ver roadmap — Compressão de fotos).
- Se o volume crescer, migração para S3/R2 é isolada em `lib/gridfs.ts`.

### 2.3 Server Actions

Toda a lógica de escrita/leitura de dados fica em `actions/handover-actions.ts`, com diretiva
`'use server'`. O cliente chama as actions diretamente (via `useTransition` no formulário).

---

## 3. Estrutura de pastas

```
viatura-check/
├── .env.local                 # variáveis de ambiente (NÃO versionado)
├── next.config.mjs            # PWA (next-pwa)
├── package.json
├── tsconfig.json              # alias @/*
├── tailwind.config.ts         # (residual — Tailwind v4 usa config via CSS)
├── postcss.config.mjs         # @tailwindcss/postcss
├── components.json            # config shadcn/ui
├── actions/
│   └── handover-actions.ts    # Server Actions (submit, list, getById, delete)
├── app/
│   ├── layout.tsx             # raiz (fontes, ThemeProvider, Toaster, metas PWA)
│   ├── globals.css            # Tailwind v4 + variáveis do tema shadcn
│   ├── page.tsx               # / → formulário público
│   ├── sucesso/
│   │   └── page.tsx           # /sucesso
│   ├── admin/
│   │   ├── page.tsx           # /admin → listagem
│   │   └── [id]/
│   │       └── page.tsx       # /admin/[id] → detalhe
│   └── api/
│       └── photos/[id]/
│           └── route.ts       # serve imagem do GridFS
├── components/
│   ├── ui/                    # shadcn (button, card, input, ...)
│   └── app/
│       ├── HandoverForm (via app/page.tsx)
│       ├── PhotoCapture.tsx
│       ├── ChecklistItem.tsx
│       └── OfficerFields.tsx
├── lib/
│   ├── mongodb.ts             # conexão singleton
│   ├── gridfs.ts              # upload/leitura/delete de fotos
│   ├── validation.ts          # schemas Zod + constantes
│   └── utils.ts               # cn()
├── hooks/                     # (vazio — usar para hooks customizados, ex.: use-media-query)
├── public/
│   ├── manifest.json          # PWA
│   ├── icon-192.png / icon-512.png
│   └── sw.js                  # gerado pelo next-pwa em build
├── docs/                      # documentação (ver docs/README.md)
└── scripts/                   # (futuro) seed-admin.mjs
```

---

## 4. Padrões de código

1. **Server Actions** em `actions/*.ts` com `'use server'` — regra de negócio e acesso ao banco no
   servidor.
2. **Acesso a dados** centralizado em `lib/` (`lib/mongodb.ts` expõe `connectToDatabase()`).
3. **Componentes de UI genéricos** em `components/ui/`; **componentes de negócio** em
   `components/app/`.
4. **Mobile-first** com Tailwind: estilos base sem prefixo para mobile e `sm/md/lg` para desktop.
5. **Padrão Drawer vs Dialog**: em mobile usar `Drawer` (abre de baixo); em desktop
   `Dialog`/`AlertDialog` — decidido por um hook de media query (`use-media-query` em
   `hooks/`, ainda a criar). Atualmente o admin usa `AlertDialog` para confirmação de exclusão.
6. **Feedback** ao usuário via toasts (`sonner`) — `<Toaster />` montado no layout raiz.
7. **PWA** via `next-pwa` no `next.config.mjs` + `public/manifest.json`.
8. **Alias de importação** `@/*` (configurado no `tsconfig.json`).
9. **Variáveis de ambiente** consumidas via `process.env` (ver
   [07-guia-de-desenvolvimento.md](./07-guia-de-desenvolvimento.md)).
10. **Validação no servidor** com Zod (`lib/validation.ts`) — nunca confiar no cliente.

---

## 5. Observações sobre a stack

### 5.1 Tailwind v4 (diferença em relação à doc de engenharia)

O projeto foi inicializado com **Tailwind v4** + `@tailwindcss/postcss` (a doc de engenharia citava
v3.4, mas os componentes shadcn base-nova exigem v4):

- A configuração de tema é feita em `app/globals.css` via `@theme inline`, **não** em
  `tailwind.config.ts` (que ficou residual e pode ser removido).
- `postcss.config.mjs` usa o plugin `@tailwindcss/postcss`.

### 5.2 shadcn base-nova (diferença em relação à doc de engenharia)

Os componentes shadcn usam **@base-ui/react** (não Radix):

- O `<Button>` usa prop `render` (ex.: `<Button render={<Link href="/" />} />`) em vez de `asChild`.
- `<RadioGroup>`/`<RadioGroupItem>` do `@base-ui/react` usam `value`/`onValueChange`.
- O `<AlertDialog>` controla abertura com `open`/`onOpenChange`.

### 5.3 Driver mongodb v7 (diferença em relação à doc de engenharia)

- No GridFS, `contentType` vai em `metadata` (`{ metadata: { contentType } }`) — a opção top-level
  `contentType` não existe mais — `lib/gridfs.ts:12`.
- Zod v4: `z.record` exige 2 argumentos (`z.record(z.string(), schema)`).