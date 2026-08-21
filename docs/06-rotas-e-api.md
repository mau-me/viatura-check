# 06 — Rotas e API

> Referência de todas as rotas (páginas e API) e Server Actions do sistema, com métodos, entradas e
> saídas. Útil para full-stack e QA.

---

## 1. Páginas (App Router)

### 1.1 `/` — Formulário público de carga

- **Tipo:** Client Component (`app/page.tsx`)
- **Acesso:** público (sem login) — RF-01
- **Conteúdo:** formulário em cards — Viatura, Policiais, Checklist, Fotos, Observações.

### 1.2 `/sucesso` — Confirmação

- **Tipo:** Server Component (`app/sucesso/page.tsx`)
- **Query param:** `?id=<ObjectId>` (opcional) — exibe o identificador do registro.
- **Ações:** botões "Nova Carga" (`/`) e "Ver registros (admin)" (`/admin`).

### 1.3 `/admin` — Listagem e gestão

- **Tipo:** Client Component (`app/admin/page.tsx`)
- **Acesso:** por link direto (fase 1, sem login) — RF-10
- **Funcionalidades:** lista registros (limite 200), busca por placa/nome, exclusão com confirmação,
  navegação para detalhe.

### 1.4 `/admin/[id]` — Detalhe do registro

- **Tipo:** Client Component (`app/admin/[id]/page.tsx`)
- **Acesso:** por link direto (fase 1)
- **Conteúdo:** dados dos policiais, kilometragem, observações, checklist com observações de
  alterações e fotos (via `/api/photos/[id]`).
- **Parâmetro:** `[id]` = `ObjectId` do registro.

---

## 2. Route Handlers

### 2.1 `GET /api/photos/[id]`

- **Arquivo:** `app/api/photos/[id]/route.ts`
- **Parâmetro:** `[id]` = `ObjectId` da foto no GridFS.
- **Resposta:**
  - `200` — imagem com `Content-Type` do arquivo e `Cache-Control: public, max-age=31536000, immutable`.
  - `404` — `Foto não encontrada` (ID inválido ou arquivo inexistente).
- **Uso:** `<img src={/api/photos/${pid}} />` nas telas de admin.

---

## 3. Server Actions (`actions/handover-actions.ts`)

Todas usam `'use server'` e são chamadas diretamente pelo cliente.

### 3.1 `submitHandoverAction(formData: FormData)`

- **Função:** cria um registro de carga (dados + 5 fotos).
- **Entrada (`FormData`):**
  | Campo | Descrição |
  |---|---|
  | `plate` | Placa/prefixo (normalizado) |
  | `officer_patente` / `officer_nome` / `officer_matricula` | Responsável pela carga |
  | `delivered_patente` / `delivered_nome` / `delivered_matricula` | Quem entregou |
  | `received_patente` / `received_nome` / `received_matricula` | Quem recebeu |
  | `km_initial` / `km_final` | Kilometragem |
  | `check_<item>` | Status de cada item do checklist (`ok`/`alteracao`) |
  | `obs_<item>` | Observação por item (quando `alteracao`) |
  | `observations` | Outras informações |
  | `photo_frente`, `photo_fundo`, `photo_lateral_esquerda`, `photo_lateral_direita`, `photo_painel` | Arquivos (File) |
- **Retorno:** `{ success: true, id }` ou `{ error: string }`.
- **Efeitos colaterais:** upload GridFS das fotos, insert em `handovers`, `revalidatePath('/admin')`.

### 3.2 `getHandoversAction(query = '')`

- **Função:** lista registros (mais recentes primeiro, limite 200).
- **Entrada:** `query` opcional — busca por `plate` ou `officer.nome` (regex case-insensitive).
- **Retorno:** `{ success: true, records: [...] }` ou `{ error }`.
- **Formato de cada record:** `_id`, `plate`, `officer`, `kilometers`, `createdAt`,
  `hasAlteration` (boolean).

### 3.3 `getHandoverByIdAction(id: string)`

- **Função:** retorna um registro completo.
- **Entrada:** `id` (ObjectId).
- **Retorno:** `{ success: true, record }` (documento completo com `_id` como string) ou
  `{ error }` (ID inválido / não encontrado).

### 3.4 `deleteHandoverAction(id: string)`

- **Função:** exclui um registro e suas fotos.
- **Entrada:** `id` (ObjectId).
- **Retorno:** `{ success: true }` ou `{ error }`.
- **Efeitos colaterais:** remove as 5 fotos do GridFS, remove o documento de `handovers`,
  `revalidatePath('/admin')`.

---

## 4. Rotas planejadas (futuro)

| Rota | Status | Descrição |
|---|---|---|
| `/api/export` | 🔮 Futuro | Exportar CSV dos registros (ver roadmap — Exportação CSV) |
| `middleware.ts` (proteção `/admin`) | 🔮 Futuro | Autenticação (RF-11) |
| `/login` (ou `/admin/login`) | 🔮 Futuro | Login do admin |