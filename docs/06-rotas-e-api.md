# 06 — Rotas e API

> Referência de todas as rotas (páginas e API) e Server Actions do sistema, com métodos, entradas e
> saídas. Útil para full-stack e QA.

---

## 1. Páginas (App Router)

### 1.1 `/` — Dashboard do policial

- **Tipo:** Server Component → MainLayoutClient → UserDashboardClient (`app/page.tsx`)
- **Acesso:** autenticado (qualquer usuário logado)
- **Conteúdo:**
  - Card com viatura em aberto (se houver) + botão "Devolver"
  - Botão "Nova Carga" (desabilitado se viatura em aberto)
  - Lista de registros anteriores (histórico do policial)

### 1.2 `/carga` — Formulário de carga (saída)

- **Tipo:** Server Component → MainLayoutClient → DepartureForm (`app/carga/page.tsx`)
- **Acesso:** autenticado
- **Conteúdo:** formulário — Viatura (placa + km inicial), Policial que Entregou, Checklist, Fotos, Observações
- **Regras:** verificar se policial já tem viatura em aberto (redireciona para `/`)
- **After submit:** redireciona para `/sucesso?id=<id>&phase=departure`

### 1.3 `/devolucao/[id]` — Formulário de devolução (retorno)

- **Tipo:** Server Component → MainLayoutClient → ReturnForm (`app/devolucao/[id]/page.tsx`)
- **Acesso:** autenticado (apenas o policial que fez a carga)
- **Conteúdo:** formulário — Km Final, Policial que Recebeu, Fotos, Observações
- **Regras:** verificar se registro pertence ao policial e está aberto
- **After submit:** redireciona para `/sucesso?id=<id>&phase=return`

### 1.4 `/sucesso` — Confirmação

- **Tipo:** Server Component (`app/sucesso/page.tsx`)
- **Query params:** `?id=<ObjectId>&phase=departure|return`
- **Conteúdo:** mensagem conforme fase + link para dashboard

### 1.5 `/admin` — Administração

- **Tipo:** Server Component → AdminLayoutClient (`app/admin/page.tsx`)
- **Acesso:** admin apenas (role `admin`)
- **Tabs:**
  - **Registros:** lista com filtro (Todos / Em Aberto / Fechados), busca, exclusão, fechamento
  - **Usuários:** CRUD de usuários

### 1.6 `/admin/[id]` — Detalhe do registro

- **Tipo:** Server Component → AdminLayoutClient → HandoverDetailClient (`app/admin/[id]/page.tsx`)
- **Acesso:** admin apenas
- **Conteúdo:** duas seções (Carga + Devolução), checklist, fotos de ambas as fases

### 1.7 `/login` — Login

- **Tipo:** Client Component (`app/login/page.tsx`)
- **Acesso:** público
- **Conteúdo:** fluxo 3 estados (matricula → senha/primeiro acesso → solicitação de reset)

---

## 2. Route Handlers

### 2.1 `GET /api/photos/[id]`

- **Arquivo:** `app/api/photos/[id]/route.ts`
- **Parâmetro:** `[id]` = `ObjectId` da foto no GridFS.
- **Resposta:**
  - `200` — imagem com `Content-Type` do arquivo e `Cache-Control: public, max-age=31536000, immutable`.
  - `404` — `Foto não encontrada`.

### 2.2 `GET /api/auth/me`

- **Arquivo:** `app/api/auth/me/route.ts`
- **Retorna:** dados do usuário autenticado a partir do cookie de sessão.

### 2.3 `POST /api/auth/logout`

- **Arquivo:** `app/api/auth/logout/route.ts`
- **Ação:** remove cookie de sessão.

---

## 3. Server Actions

### 3.1 `actions/handover-actions.ts`

| Action | Descrição |
|---|---|
| `createDepartureAction(formData)` | Cria registro de carga (status "aberto") |
| `completeReturnAction(id, formData)` | Finaliza devolução (status "fechado") |
| `adminCloseHandoverAction(id)` | Admin fecha registro em aberto |
| `getOpenHandoverByOfficer(matricula)` | Busca registro aberto de um policial |
| `getHandoversAction(query?, status?)` | Lista registros com filtro (abertos/fechados/todos) |
| `getHandoverByIdAction(id)` | Retorna registro completo |
| `deleteHandoverAction(id)` | Exclui registro e fotos |

### 3.2 `actions/auth-actions.ts`

| Action | Descrição |
|---|---|
| `loginAction(prev, formData)` | Login com fluxo 3 estados |
| `setupPasswordAction(prev, formData)` | Primeiro acesso — criar senha |
| `requestPasswordResetAction(prev, formData)` | Solicitar reset de senha |
| `logoutAction()` | Limpa sessão |
| `createUserAction(prev, formData)` | Cria usuário (admin) |
| `updateUserAction(id, prev, formData)` | Atualiza usuário (admin) |
| `deleteUserAction(id)` | Exclui usuário (admin) |
| `listUsersAction(query?, page?, limit?)` | Lista usuários (admin) |
| `changePasswordAction(prev, formData)` | Altera senha (logueado) |
| `adminClearUserPasswordAction(id)` | Admin limpa senha de usuário |

---

## 4. Middleware

- **Arquivo:** `middleware.ts`
- **Matcher:** todas as rotas exceto `api`, `_next/*`, `favicon.ico`
- **Regras:**
  - `/login` com sessão válida → redireciona para `/`
  - Rota protegida sem sessão → redireciona para `/login`
  - `/admin` sem role `admin` → redireciona para `/`
