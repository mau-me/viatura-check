# 07 — Guia de Desenvolvimento

> Guia prático para desenvolver, rodar, testar e publicar o sistema `viatura-check`: setup local,
> variáveis de ambiente, comandos, testes e deploy.

---

## 1. Pré-requisitos

- Node.js `>= 20` (recomendado: `22.x`)
- npm `>= 10`
- Conta MongoDB Atlas (ou MongoDB local/Docker) com string de conexão pronta

## 2. Setup local

```bash
npm install          # instala dependências
npm run dev          # servidor de desenvolvimento em http://localhost:3000
```

### Variáveis de ambiente (`.env.local`)

Crie `.env.local` na raiz do projeto (não versionado — já está no `.gitignore`):

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/viatura?retryWrites=true&w=majority
JWT_SECRET=um-segredo-super-secreto-troque-isto
ADMIN_ACCESS_KEY=chave-secreta-do-admin
MAX_PHOTO_SIZE_MB=2
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGODB_URI` | ✅ | String de conexão (banco `viatura`). O app falha na inicialização sem ela |
| `JWT_SECRET` | 🔮 (fase 2) | Segredo para JWT (autenticação futura) |
| `ADMIN_ACCESS_KEY` | 🔮 (fase 2) | PIN simples para `/admin` (futuro) |
| `MAX_PHOTO_SIZE_MB` | Não | Tamanho máximo por foto em MB (padrão `2`) |

### MongoDB local (alternativa ao Atlas)

```bash
docker run -d --name mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=viatura mongo:7
# MONGODB_URI=mongodb://localhost:27017/viatura
```

## 3. Scripts npm

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (com PWA em modo dev) |
| `npm run build` | Build de produção (gera `public/sw.js` do PWA) |
| `npm start` | Servidor de produção após `build` |
| `npm run lint` | ESLint (`next lint`) |

## 4. Verificação rápida de funcionamento

1. `npm run dev` → abrir `http://localhost:3000` no celular (ou DevTools mobile) → formulário aparece.
2. Preencher + capturar 5 fotos → submeter → toast de sucesso → `/sucesso`.
3. Conferir no MongoDB a coleção `handovers` e o bucket GridFS `photos`.
4. Abrir `/admin` → registro listado → abrir detalhe → fotos carregam via `/api/photos/[id]`.

> Sem `MONGODB_URI` válida, a submissão/leitura falhará com erro amigável; o formulário e as telas
> estáticas ainda renderizam.

## 5. Testes

**Não há suíte automatizada ainda** (roadmap — ver
[03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md#55-testes-automatizados-e-ci)).
Verificação manual recomendada:

- Fluxo completo: preencher → capturar → salvar → aparecer no admin → abrir detalhe → excluir.
- Validação: km final < inicial deve falhar; submissão sem as 5 fotos deve falhar.
- Responsividade: viewport mobile (375px) e desktop (1440px).

Sugestões futuras (instalar quando houver suíte):

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install
```

## 6. Deploy

### Opção recomendada: Vercel + MongoDB Atlas

```bash
npm run build          # deve concluir sem erros (gera public/sw.js)
npx vercel             # primeiro deploy
```

**Variáveis de ambiente no painel da Vercel (Settings → Environment Variables):** mesmas do `.env.local`
(`MONGODB_URI`, `JWT_SECRET`, `ADMIN_ACCESS_KEY`, `MAX_PHOTO_SIZE_MB`).

**Atenções de produção:**
- **Limite de body serverless (~4.5MB na Vercel):** hoje as fotos vão sem compressão; se estourar,
  implementar a compressão no cliente (roadmap — Compressão de fotos) ou migrar para upload direto.
- **Timeout serverless:** upload GridFS de 5 fotos pequenas é rápido; OK para o volume atual.
- **Índices:** criar `handovers.createdAt` e `handovers.plate` no Atlas (ver
  [05-modelagem-de-dados.md](./05-modelagem-de-dados.md#4-índices-recomendados)).
- **Backup:** habilitar backups no Atlas (fotos inclusas via GridFS).

### Alternativas

- **Railway / Render / Fly.io:** mesmo projeto, `npm run build && npm start`. Sem limite rígido de
  body (ajustável) — útil se as fotos forem grandes.
- **VPS (Docker):** `next start` atrás de Nginx/Caddy com HTTPS.

## 7. Índices e manutenção do banco

- Coleção principal: `handovers` (ver [05-modelagem-de-dados.md](./05-modelagem-de-dados.md)).
- Fotos: GridFS bucket `photos` (`photos.files` + `photos.chunks`).
- Exclusão de registro remove fotos + documento (ação do admin).