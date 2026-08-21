# AGENTS.md

## Projeto

App web **mobile-first** (Next.js 14 App Router) de checklist de carga/devolução de viatura: formulário
público (`/`), 5 fotos (GridFS), área admin `/admin` e `/admin/[id]` **sem autenticação (fase 1)**.
Toda a documentação vive em `docs/` (portal: `docs/README.md`, guia de escrita: `docs/GUIA-DE-ESCRITA.md`).
`DOCUMENTACAO_PROJETO_VIATURA.md` é a especificação de engenharia original (pt-BR).

## Comandos

- `npm run dev` / `npm run build` / `npm start` / `npm run lint`
- **Não há testes nem typecheck script.** O typecheck acontece implicitamente no `npm run build` — use o build como verificação.
- Ordem de verificação: `npm run lint` → `npm run build`.

## Config/ambiente

- **`.env.local` é obrigatório** (não versionado). `lib/mongodb.ts` lança erro no import se
  `MONGODB_URI` faltar. Variáveis: `MONGODB_URI` (obrigatória), `JWT_SECRET`, `ADMIN_ACCESS_KEY`,
  `MAX_PHOTO_SIZE_MB` (fase 2/futuro).
- Banco: `viatura` (hardcoded em `lib/mongodb.ts:31`), coleção `handovers`, GridFS bucket `photos`.
- Path alias `@/*` → raiz do projeto (`tsconfig.json`).

## Armadilhas da stack (desvios de docs genéricas)

- **React 18** (não 19): não existe `useFormState`/`useFormStatus`. Formulários usam `useTransition` +
  chamada direta da Server Action (`app/page.tsx:43`). Não migrar para hooks do React 19.
- **shadcn/ui estilo `base-nova`** (`components.json`): `<Button>` usa prop `render` (não `asChild`);
  componentes baseados em `@base-ui/react` (RadioGroup usa `value`/`onValueChange`; AlertDialog usa
  `open`/`onOpenChange`). Não assumir API do shadcn "clássico" (Radix).
- **Tailwind v4** (CSS-first): `postcss.config.mjs` usa `@tailwindcss/postcss`; tokens em
  `app/globals.css` com `@theme inline`. `tailwind.config.ts` é **residual/inativo** — não confiar nele
  nem usá-lo para configuração.
- **mongodb v7**: no GridFS, `contentType` vai em `metadata` (`lib/gridfs.ts:12`), não no documento raiz.
- **zod v4**: `z.record` exige 2 argumentos; esquemas estão em `lib/validation.ts`.

## PWA (next-pwa)

- `next.config.mjs` usa `disable: process.env.NODE_ENV === "development"`. **Não remover**: sem isso o
  `GenerateSW` roda em loop no dev (regenera `public/sw.js` repetidamente) e o service worker com
  `skipWaiting`+`clientsClaim` recarrega a página e **apaga dados digitados no formulário**.
- O dev gera `public/sw.js`, `public/sw.js.map`, `public/workbox-*.js` apenas no build de produção.

## Arquitetura

- `actions/handover-actions.ts` — Server Actions (`'use server'`): `submitHandoverAction`,
  `getHandoversAction`, `getHandoverByIdAction`, `deleteHandoverAction`. Referências: `app/page.tsx:44`,
  `app/admin/page.tsx`, `app/admin/[id]/page.tsx`.
- `components/app/` — componentes de negócio client-side (`PhotoCapture`, `ChecklistItem`,
  `OfficerFields`). `components/ui/` — shadcn base-nova.
- `app/api/photos/[id]/route.ts` — serve fotos do GridFS (GET público).
- Campos de formulário são **não-controlados** (leitura via `FormData` no submit); `photos` é o único
  estado em `app/page.tsx` (File + preview via `URL.createObjectURL`).

## Convenções

- App e docs em **pt-BR**. Código **sem comentários** (a menos que peço).
- Ao criar/alteração de funcionalidade, atualizar `docs/02-funcionalidades-implementadas.md` /
  `docs/03-funcionalidades-futuras.md` seguindo o `docs/GUIA-DE-ESCRITA.md` (status
  ✅/🚧/🔮/⛔, prioridades P0–P3, templates obrigatórios).
- Imagens usam `<img>` com `images.unoptimized: true` (evitar `next/image` em foto de upload dinâmico).