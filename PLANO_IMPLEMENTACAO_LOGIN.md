# Plano de Implementação — Sistema de Login e Autorização

> Baseado na documentação do projeto (`DOCUMENTACAO_PROJETO_VIATURA.md`, `docs/03-funcionalidades-futuras.md`, `docs/05-modelagem-de-dados.md`, `docs/04-arquitetura.md`).

---

## 1. Visão Geral

Implementar autenticação completa com:
- **Login por matrícula + senha** (JWT + cookie httpOnly)
- **Primeiro acesso**: criação de senha obrigatória
- **Roles**: `admin` | `user`
- **Proteção de rotas**: `/admin` apenas para `admin`
- **CRUD de usuários** (apenas admins)
- **Busca avançada** na listagem admin (matrícula, nome, placa, data, status)

---

## 2. Modelagem de Dados — Coleção `users`

Baseada em `docs/05-modelagem-de-dados.md#5-coleção-users-fase-futura`, com ajustes para matrícula como identificador principal:

```js
{
  _id: ObjectId,
  matricula: "123456",           // único, index único (substitui CPF)
  nome: "João da Silva",
  patente: "Sd",                 // novo campo
  email: "email@exemplo.com",    // opcional
  role: "admin" | "user",
  passwordHash: "<bcrypt>",      // null até primeiro acesso
  isActive: true,
  primeiroAcesso: true,          // flag para forçar troca de senha
  createdAt: ISODate,
  updatedAt: ISODate,
  lastLoginAt: Date,
  passwordChangedAt: Date
}
```

**Índices:**
```js
db.users.createIndex({ matricula: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ isActive: 1 })
```

---

## 3. Arquitetura de Autenticação

### 3.1 Stack (já instaladas)
- `jsonwebtoken` — assinatura/verificação JWT (HS256)
- `bcryptjs` — hash de senha (cost 12)

### 3.2 Novos arquivos em `lib/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/jwt.ts` | `signToken(payload)`, `verifyToken(token)` — payload: `{ sub, matricula, role, nome }` |
| `lib/auth.ts` | `hashPassword()`, `verifyPassword()`, `setSessionCookie()`, `clearSessionCookie()`, `getSession()`, `requireAuth()`, `requireAdmin()` |

### 3.3 Middleware (`middleware.ts`)
- **Matcher**: `/admin/:path*`
- **Lógica**: lê cookie `viatura_session`, valida JWT com `jose` (edge-compatible) ou `jsonwebtoken` (runtime Node via config experimental) — **recomendação**: usar `jose` para middleware edge + validação completa nas Server Actions/layouts
- **Sem sessão válida** → redirect `/login?next=/admin/...`

### 3.4 Server Actions de Auth (`actions/auth-actions.ts`)
- `loginAction(matricula, password)` → valida, cria sessão, retorna `{ success, role, redirectTo }`
- `setupPasswordAction(token, newPassword, confirmPassword)` → primeiro acesso
- `logoutAction()` → limpa cookie
- `changePasswordAction(current, new, confirm)` — usuário logado
- `createUserAction(data)` — apenas admin
- `updateUserAction(id, data)` — apenas admin
- `deleteUserAction(id)` — apenas admin (não pode deletar a si mesmo)
- `listUsersAction(query, page, limit)` — apenas admin

---

## 4. Rotas e Páginas

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `/login` | Client | Público | Formulário matrícula + senha |
| `/primeiro-acesso` | Client | Token válido | Definir senha inicial |
| `/admin` | Server + Client | `admin` | Listagem (já existe) — adicionar aba "Usuários" |
| `/admin/usuarios` | Server + Client | `admin` | CRUD usuários (nova) |
| `/admin/usuarios/[id]` | Server + Client | `admin` | Editar usuário (Drawer/Dialog) |
| `/api/auth/me` | Route Handler | Autenticado | Retorna usuário atual (para client) |

### 4.1 Fluxo de Primeiro Acesso
1. Usuário entra em `/login` com matrícula cadastrada (sem senha = `passwordHash: null`)
2. `loginAction` detecta `primeiroAcesso: true` → retorna token temporário (JWT com `purpose: "setup"`, expiração 10min)
3. Redirect `/primeiro-acesso?token=...`
4. Tela pede: nova senha + confirmação (mín. 8 chars, 1 maiúscula, 1 número)
5. `setupPasswordAction` valida token, hash, atualiza usuário (`passwordHash`, `primeiroAcesso: false`, `passwordChangedAt`)
6. Cria sessão definitiva → redirect `/admin` (se admin) ou `/` (se user)

### 4.2 Cadastro Inicial de Usuários
- **Seed script**: `scripts/seed-admin.mjs` cria primeiro admin (matrícula, nome, patente, role=admin, `primeiroAcesso: true`)
- Admins criam demais usuários via UI `/admin/usuarios`
- Usuário comum (`role: user`) **não acessa `/admin`** — usa apenas formulário público `/`

---

## 5. Componentes UI Novos (em `components/app/`)

| Componente | Descrição |
|------------|-----------|
| `LoginForm.tsx` | Form matrícula + senha, `useTransition` + `useFormStatus` |
| `SetupPasswordForm.tsx` | Nova senha + confirmação, validação Zod |
| `UserTable.tsx` | Tabela admin (desktop) — colunas: matrícula, nome, patente, role, status, último login, ações |
| `UserCard.tsx` | Card admin (mobile) — mesmo conteúdo da tabela |
| `UserForm.tsx` | Dialog/Drawer para criar/editar usuário (matrícula, nome, patente, email, role, isActive) |
| `SessionProvider.tsx` | Context com dados do usuário logado (nome, role, matricula) — lido via `/api/auth/me` |

---

## 6. Atualizações em Código Existente

### 6.1 `app/admin/page.tsx` — Adicionar Abas
```
┌─────────────────────────────────────┐
│ [Registros] [Usuários]  ← Tabs      │
├─────────────────────────────────────┤
│ Busca: [placa, nome, matrícula...]  │
│                                     │
│ Lista / Cards                       │
└─────────────────────────────────────┘
```

### 6.2 `actions/handover-actions.ts` — Expandir Busca (`getHandoversAction`)
```ts
// Adicionar filtros:
const filter = query ? {
  $or: [
    { plate: { $regex: query, $options: 'i' } },
    { 'officer.nome': { $regex: query, $options: 'i' } },
    { 'officer.matricula': { $regex: query, $options: 'i' } },
    { 'deliveringOfficer.nome': { $regex: query, $options: 'i' } },
    { 'receivingOfficer.nome': { $regex: query, $options: 'i' } },
  ],
} : {}
```

### 6.3 `app/layout.tsx` — SessionProvider
Envolver `<SessionProvider>` no layout raiz para disponibilizar usuário logado em todo app.

### 6.4 `components/ui/*` — Verificar se já existem:
- `Tabs`, `Table`, `Dialog`/`Drawer`, `Select`, `Avatar`/`DropdownMenu` para menu do usuário
- Se faltarem: `npx shadcn@latest add tabs table dialog dropdown-menu avatar select`

---

## 7. Validação Zod (`lib/validation.ts` — estender)

```ts
export const loginSchema = z.object({
  matricula: z.string().trim().min(1, 'Matrícula obrigatória'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export const setupPasswordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Pelo menos 1 maiúscula')
    .regex(/[0-9]/, 'Pelo menos 1 número'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export const createUserSchema = z.object({
  matricula: z.string().trim().min(1).max(20),
  nome: z.string().trim().min(1).max(120),
  patente: z.string().trim().min(1).max(30),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean().default(true),
})

export const updateUserSchema = createUserSchema.partial().omit({ matricula: true })
```

---

## 8. Variáveis de Ambiente (`.env.local`)

```env
# Existentes
MONGODB_URI=mongodb+srv://...
JWT_SECRET=troque-isto-por-um-segredo-forte-32-chars-minimo
ADMIN_ACCESS_KEY=chave-pin-temporaria  # remover após auth completo

# Novas
JWT_EXPIRES_IN=7d          # expiração token principal
SETUP_TOKEN_EXPIRES_IN=10m # expiração token primeiro acesso
```

---

## 9. Passos de Implementação (Ordem Sugerida)

### Fase 1 — Fundação (P0)
1. [ ] Criar `lib/jwt.ts` + `lib/auth.ts`
2. [ ] Criar `middleware.ts` protegendo `/admin`
3. [ ] Criar `scripts/seed-admin.mjs` (cria 1º admin)
4. [ ] Atualizar `lib/validation.ts` com schemas de auth
5. [ ] Rodar seed e testar conexão

### Fase 2 — Login Básico (P0)
6. [ ] Criar `actions/auth-actions.ts` (login, logout, setupPassword)
7. [ ] Criar `/login/page.tsx` + `LoginForm.tsx`
8. [ ] Criar `/primeiro-acesso/page.tsx` + `SetupPasswordForm.tsx`
9. [ ] Integrar `SessionProvider` no layout raiz
10. [ ] Testar fluxo completo: login → primeiro acesso → dashboard

### Fase 3 — Proteção e Roles (P1)
11. [ ] Converter `app/admin/page.tsx` para Server Component wrapper que chama `requireAdmin()`
12. [ ] Converter `app/admin/[id]/page.tsx` igual
13. [ ] Adicionar verificação `requireAdmin()` em todas as Server Actions de admin (`deleteHandoverAction`, etc.)
14. [ ] Testar: user comum não acessa `/admin`

### Fase 4 — CRUD Usuários (P1)
15. [ ] Estender `actions/auth-actions.ts` com `createUserAction`, `updateUserAction`, `deleteUserAction`, `listUsersAction`
16. [ ] Criar `/admin/usuarios/page.tsx` + `UserTable.tsx`/`UserCard.tsx`
17. [ ] Criar `UserForm.tsx` (Dialog/Drawer)
18. [ ] Adicionar tabs em `app/admin/page.tsx` (Registros | Usuários)

### Fase 5 — Busca Avançada + UX (P1)
19. [ ] Expandir `getHandoversAction` com filtros por matrícula, nome, data, status
20. [ ] Adicionar filtros UI na listagem admin (Select status, Input data, etc.)
21. [ ] Adicionar paginação (cursor-based) — roadmap item 5.1
22. [ ] Menu do usuário logado (Avatar + DropdownMenu: perfil, sair)

### Fase 6 — Ajustes Finais (P2)
23. [ ] Rate limiting no login (Upstash ou middleware simples)
24. [ ] Logs de auditoria (login, criação/edição usuários, exclusões)
25. [ ] Atualizar docs: `docs/02-funcionalidades-implementadas.md`, `docs/03-funcionalidades-futuras.md`

---

## 10. Considerações de Segurança

1. **JWT em cookie httpOnly + Secure + SameSite=Lax** — não acessível via JS
2. **Senha nunca logada** — apenas hash
3. **Rate limit** no `/login` (ex.: 5 tentativas/15min por IP)
4. **Token de setup** de uso único, expiração curta (10min), invalidado após uso
5. **Validação server-side** em TODAS as actions (Zod)
6. **Admin não pode se deletar** nem remover próprio role admin
7. **Middleware + validação em Server Actions** — defesa em profundidade

---

## 11. Estimativa de Esforço

| Fase | Arquivos Novos | Arquivos Modificados | Complexidade |
|------|----------------|---------------------|--------------|
| 1 — Fundação | 4 | 1 | Média |
| 2 — Login | 5 | 2 | Alta |
| 3 — Proteção | 0 | 4 | Média |
| 4 — CRUD Users | 5 | 2 | Alta |
| 5 — Busca/UX | 2 | 3 | Média |
| 6 — Finalização | 1 | 2 | Baixa |
| **Total** | **~17** | **~14** | — |

---

## 12. Checklist de Validação Pós-Implementação

- [ ] `npm run lint` passa
- [ ] `npm run build` passa (typecheck implícito)
- [ ] Login com matrícula/senha funciona
- [ ] Primeiro acesso força criação de senha
- [ ] Admin acessa `/admin` e vê aba Usuários
- [ ] User comum **não** acessa `/admin` (redirect login)
- [ ] CRUD usuários funciona (criar, listar, editar, desativar)
- [ ] Busca admin filtra por matrícula, nome, placa, data
- [ ] Logout limpa sessão e redireciona `/login`
- [ ] Seed cria admin funcional
- [ ] PWA continua funcionando (build gera sw.js)

---

## 13. Referências de Código do Projeto Atual

- **Server Actions pattern**: `actions/handover-actions.ts`
- **Zod schemas**: `lib/validation.ts`
- **MongoDB connection**: `lib/mongodb.ts`
- **UI components**: `components/ui/*` (base-nova style)
- **Mobile-first patterns**: `app/page.tsx`, `app/admin/page.tsx`
- **Toast/feedback**: `sonner` via `<Toaster />` em `app/layout.tsx`