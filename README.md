# viatura-check — Controle de Carga/Devolução de Viatura

Sistema web **mobile-first** para registro de carga de viatura: checklist das condições do veículo,
5 fotos e persistência em MongoDB. Formulário público (sem login) + área administrativa `/admin`.

## Stack

Next.js 14 (App Router) · TypeScript · MongoDB (GridFS) · Tailwind CSS v4 · shadcn/ui · Server
Actions · PWA.

> Detalhes completos da stack e decisões de arquitetura em [docs/04-arquitetura.md](./docs/04-arquitetura.md).

## Documentação

Toda a documentação do projeto vive em [`docs/`](./docs/README.md):

- **Base/diretrizes:** [docs/GUIA-DE-ESCRITA.md](./docs/GUIA-DE-ESCRITA.md) — regras para escrever
  e manter a documentação.
- **Funcionalidades implementadas:** [docs/02-funcionalidades-implementadas.md](./docs/02-funcionalidades-implementadas.md)
- **Roadmap (funcionalidades futuras):** [docs/03-funcionalidades-futuras.md](./docs/03-funcionalidades-futuras.md)

## Começando

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Configure `MONGODB_URI` no `.env.local`
(veja [docs/07-guia-de-desenvolvimento.md](./docs/07-guia-de-desenvolvimento.md)).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gera o service worker do PWA) |
| `npm start` | Servidor de produção |
| `npm run lint` | ESLint |

## Estado atual

- **Fase 1:** formulário público, admin por link direto, sem autenticação.
- Ver o estado completo em [docs/README.md](./docs/README.md).