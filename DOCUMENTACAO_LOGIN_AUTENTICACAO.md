# Documentação Completa: Sistema de Login e Autenticação — PL4K1NH4

> **Objetivo:** Este documento descreve de forma completa e autocontida o sistema de autenticação do PL4K1NH4, permitindo que toda a lógica, estética e regras de negócio sejam reimplementadas em outro sistema sem necessidade de consultar o código-fonte original.

---

## Sumário

1. [Visão Geral e Stack Tecnológica](#1-visão-geral-e-stack-tecnológica)
2. [Modelo de Dados](#2-modelo-de-dados)
3. [Regras de Perfis (Roles) e Telas por Perfil](#3-regras-de-perfis-roles-e-telas-por-perfil)
4. [Sessão, JWT e Proteção de Rotas](#4-sessão-jwt-e-proteção-de-rotas)
5. [Fluxo de Login Multi-etapas](#5-fluxo-de-login-multi-etapas)
6. [Primeiro Acesso — Criação de Senha](#6-primeiro-acesso--criação-de-senha)
7. [Redefinição de Senha](#7-redefinição-de-senha)
8. [Especificação Visual da Tela de Login](#8-especificação-visual-da-tela-de-login)
9. [Gestão de Usuários pelo Administrador](#9-gestão-de-usuários-pelo-administrador)
10. [Segurança e Variáveis de Ambiente](#10-segurança-e-variáveis-de-ambiente)
11. [Análise do PASSWORD_IMPLEMENTATION_PLAN.md (Aproveitável)](#11-análise-do-password_implementation_planmd-aproveitável)
12. [Gaps Conhecidos a Corrigir na Nova Implementação](#12-gaps-conhecidos-a-corrigir-na-nova-implementação)
13. [Checklist de Reimplementação e Mapa de Arquivos](#13-checklist-de-reimplementação-e-mapa-de-arquivos)

---

## 1. Visão Geral e Stack Tecnológica

O sistema utiliza **autenticação por CPF + senha** com fluxo em múltiplas etapas. O primeiro acesso não exige senha: o usuário define sua própria senha na tela de login. A redefinição de senha é feita por solicitação ao administrador (não há envio de e-mail).

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) com React 18 |
| Backend | Server Actions (`'use server'`) — não há API REST de autenticação |
| Banco de dados | MongoDB (collection `users`) via driver oficial `mongodb` |
| Sessão | JWT assinado com `jsonwebtoken`, armazenado em cookie `httpOnly` |
| Hash de senha | `bcryptjs` com custo (salt rounds) = **12** |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Notificações | `sonner` (toasts) |
| Ícones | `lucide-react` |

### Princípios arquiteturais

- **Server Actions como única camada de escrita:** todas as operações de login/senha são funções server-side em `actions/auth-actions.ts`.
- **Hidratação server → client:** o layout protegido `(main)/layout.tsx` decodifica o JWT do cookie, busca o usuário no banco e injeta os dados no contexto React cliente (`AuthContext`).
- **Middleware de borda:** protege todas as rotas (exceto `/login` e assets) verificando apenas a *existência* do cookie de token — a validação real do token ocorre no servidor de aplicação.

---

## 2. Modelo de Dados

### 2.1. Interface `User` (referência: `lib/auth.ts`)

```typescript
export interface User {
  _id?: string                    // ObjectId do MongoDB convertido para string
  cpf: string                     // 11 dígitos numéricos, SEM formatação (ex: "06468856507")
  name: string                    // Nome completo
  email?: string                  // Opcional
  role: 'admin' | 'user'          // Perfil de acesso
  credits: number                 // Créditos de consulta (admin é tratado como ilimitado na UI)
  password?: string               // Hash bcrypt da senha. Ausente/vazio = primeiro acesso
  createdAt: Date
  lastLogin?: Date                // Atualizado a cada login bem-sucedido
  isActive: boolean               // Soft delete: false = excluído
  passwordResetRequested?: boolean // Flag de solicitação de redefinição (padrão: false)
}
```

### 2.2. Regras do modelo

| Regra | Detalhe |
|---|---|
| Identificador de login | `cpf` (único). Sempre normalizado: remover tudo que não for dígito antes de salvar/buscar |
| Senha ausente ou vazia | Interpreta-se como **primeiro acesso** → tela de definição de senha |
| Busca de usuários | Todas as consultas filtram `isActive: true` (usuários inativos não logam nem aparecem) |
| Exclusão | **Soft delete**: apenas `isActive: false`. Nenhum dado é removido |
| Novos usuários | Criados **sem senha**, com `credits: 5` (créditos iniciais), `isActive: true` e `createdAt` atual |
| Retorno seguro | Funções de listagem nunca retornam o hash (`password: undefined`) |
| `lastLogin` | Gravado via `$set { lastLogin: new Date() }` somente após senha validada |

### 2.3. Bootstrap do primeiro administrador

Script `scripts/seed-admin.mjs` (executado via `npm run db:seed`):

1. Lê `MONGODB_URI` de `.env.local`.
2. Se a collection `users` já tiver documentos, aborta.
3. Insere um admin fixo (CPF, nome, e-mail configurados no próprio script) com `role: 'admin'`, `credits: 0`, `isActive: true` e **sem campo `password`**.
4. O admin define a senha no primeiro login pelo fluxo de primeiro acesso (seção 6).

> Na nova implementação, parametrizar os dados do admin via variáveis de ambiente em vez de hardcode.

---

## 3. Regras de Perfis (Roles) e Telas por Perfil

Existem exatamente **dois perfis**: `'admin'` e `'user'`. Não há hierarquia intermediária.

### 3.1. Matriz de telas por perfil

| Tela | Rota | `user` | `admin` | Observações |
|---|:---:|:---:|:---:|---|
| Dashboard | `/dashboard` | ✅ | ✅ | Consulta de veículos (consome créditos) |
| Histórico | `/history` | ✅ | ✅ | Lista de consultas; detalhe em `/history/[plate]` |
| Créditos | `/credits` | ✅ | ✅ | Compra de créditos via PIX/Mercado Pago |
| Pagamentos | `/payments` | ✅ | ✅ | "Meus Pagamentos" |
| **Administração** | `/admin` | ❌ | ✅ | Gerenciamento de usuários (CRUD, créditos, senhas) |

### 3.2. Como a navegação muda por perfil (Sidebar — `components/app/Sidebar.tsx`)

```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Histórico', href: '/history',   icon: History },
  { name: 'Créditos',  href: '/credits',   icon: Wallet },
  { name: 'Pagamentos',href: '/payments',  icon: CreditCard },
]

const adminNavigation = [
  { name: 'Admin', href: '/admin', icon: Shield },   // ícone Shield (escudo) do lucide
]

// Concatenação condicional:
const allNavigation =
  user?.role === 'admin' ? [...navigation, ...adminNavigation] : navigation
```

- **Desktop:** sidebar fixa à esquerda (`lg:w-64`), logo + nome "Plakinha" no topo, item ativo destacado com `bg-primary text-primary-foreground`.
- **Mobile:** barra de navegação inferior fixa (`lg:hidden`), ícone + rótulo por item, item ativo em `text-primary`.

### 3.3. Diferenças visuais adicionais por perfil

| Elemento | `user` | `admin` |
|---|---|---|
| Badge de créditos no Header | Exibido (ícone `Coins` âmbar + número, pílula com borda) | **Oculto** (`Header.tsx`: `user.role !== 'admin' && ...`) |
| Coluna "Créditos" na tabela admin | Valor numérico | Símbolo `∞` |
| Badge de função na tabela admin | `Usuário` (Badge `secondary`, ícone `User`) | `Admin` (Badge `default`, ícone `Shield`) |
| Item "Limpar Senha" no dropdown | — | Visível **somente** se `passwordResetRequested === true` |

### 3.4. Fluxo de dados do perfil até a UI

```
Cookie auth-token
   │ (server component)
   ▼
(main)/layout.tsx → verifyToken(token) → findUserById(decoded.userId)
   │  retorna { id, cpf, name, role, credits } ou null
   ▼
<MainLayoutClient user={...}>            (client component)
   ▼
<AuthProvider user={...}>                (context/AuthContext.tsx)
   ├── useAuth() → { user, isAuthenticated, logout }
   ├── <Header />    usa user.role p/ badge de créditos
   └── <Sidebar />   usa user.role p/ montar navegação
```

Contrato do contexto:

```typescript
interface AuthContextType {
  user: { id: string; cpf: string; name: string; role: 'admin' | 'user'; credits: number } | null
  isAuthenticated: boolean
  logout: () => Promise<void>   // chama logoutAction() e força window.location.href = '/login'
}
```

> ⚠️ **Gap importante:** a rota `/admin` hoje é protegida apenas visualmente (item some do menu). Não há verificação de `role` no servidor dessa página. Ver seção 12, gap #1.

---

## 4. Sessão, JWT e Proteção de Rotas

### 4.1. Token JWT (referência: `lib/jwt.ts`)

```typescript
// Payload assinado:
{
  userId: user._id,     // _id do MongoDB (string)
  cpf: user.cpf,
  role: user.role,      // 'admin' | 'user'
  name: user.name
}
// Assinatura: HS256 (padrão), segredo em process.env.JWT_SECRET
// Expiração: '7d'
```

- `verifyToken(token)` retorna o payload decodificado ou lança `Error('Token inválido')`.
- A existência de `JWT_SECRET` é validada no import do módulo (falha rápida se ausente).

### 4.2. Cookie de sessão

Definido pela `loginAction` após senha validada:

```typescript
cookies().set('auth-token', token, {
  httpOnly: true,                                  // inacessível ao JS do browser
  secure: process.env.NODE_ENV === 'production',   // HTTPS apenas em produção
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7                         // 7 dias (mesma duração do JWT)
})
```

### 4.3. Middleware de rotas (referência: `middleware.ts`)

```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))   // exige login
  }
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url)) // já logado
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

Regras derivadas:

- Rotas de `api/`, assets estáticos e favicon **não passam** pelo middleware.
- O middleware valida apenas a presença do cookie — **não** decodifica nem valida a assinatura do JWT (isso é feito no layout/páginas server-side).
- Usuário autenticado que acessa `/login` é levado direto ao dashboard.

### 4.4. Logout

`logoutAction()` (server action): apaga o cookie `auth-token` e redireciona para `/login`. No cliente, `AuthContext.logout()` chama a action e força `window.location.href = '/login'` como garantia extra.

---

## 5. Fluxo de Login Multi-etapas

A tela de login (`app/login/page.tsx`) é uma **máquina de estados** com 3 visões mutuamente exclusivas, controladas por 3 flags locais:

```typescript
const [currentCPF, setCurrentCPF] = useState('')        // CPF limpo (só dígitos)
const [showPasswordInput, setShowPasswordInput] = useState(false)  // etapa 2 visível
const [isFirstAccess, setIsFirstAccess] = useState(false)          // etapa 2 = definir senha?
const [showResetPassword, setShowResetPassword] = useState(false)  // visão de redefinição
```

### 5.1. Máquina de estados

```
                    ┌─────────────────────────────┐
                    │  ESTADO A — Formulário CPF  │◄──────────────────────────┐
                    │  input CPF + botão Entrar   │                           │
                    └──────────────┬──────────────┘                           │
                                   │ submit loginAction({cpf})                │ botões "Voltar"
              ┌────────────────────┼──────────────────────┐                   │ (resetam flags
              ▼                    ▼                      ▼                   │  e limpam CPF)
   {success, isFirstAccess}  {success, needsPassword}  {error}               │
   usuário SEM senha         usuário COM senha           │                   │
              │                    │                      └── Alert erro      │
              ▼                    ▼                        (permanece em A)  │
   ┌──────────────────────────────────────────┐                             │
   │  ESTADO B — Formulário de Senha          │─────────────────────────────┘
   │  CPF travado (read-only, bg-muted)       │
   │  isFirstAccess?                          │
   │    SIM → Nova Senha + Confirmar Senha    │──submit setPasswordAction──► sucesso:
   │    NÃO → Senha                           │       (só se isFirstAccess)  toast "Senha definida
   │  Botão: Definir Senha | Entrar           │                              com sucesso! Faça
   │  Link: Voltar                            │                              login." → volta a A
   └──────────────────────────────────────────┘
                                              └─submit loginAction({cpf,password})─►
                                                   sucesso: seta cookie + redirect /dashboard

   ESTADO A ──clique "Esqueceu a senha?"──► ┌─────────────────────────────┐
                                            │ ESTADO C — Redefinição      │
                                            │ input CPF + botão           │
                                            │ "Solicitar Redefinição"     │
                                            │ Link: Voltar ao Login       │
                                            └──────────────┬──────────────┘
                                                           │ submit requestPasswordResetAction
                                                           ▼
                                               sucesso: toast info "Solicitação enviada..."
                                                        → volta automaticamente ao Estado A
```

### 5.2. Contrato da `loginAction`

```typescript
async function loginAction(prevState, formData): Promise<{
  success: boolean
  error?: string
  isFirstAccess?: boolean   // true = usuário existe e NÃO tem senha → mostrar criação de senha
  needsPassword?: boolean   // true = usuário existe e TEM senha → mostrar input de senha
  userCPF?: string          // CPF limpo (11 dígitos) para preencher a etapa seguinte
}>
```

Lógica passo a passo (ordem exata das validações):

1. `cpf` vazio → `{ success:false, error:'CPF é obrigatório' }`
2. Limpa máscara: `cpf.replace(/\D/g, '')`; se `length !== 11` → `'CPF deve ter 11 dígitos'`
3. Busca usuário por CPF (**com filtro `isActive:true`**); não encontrado → `'Usuário não encontrado'`
4. **Senha não informada** (primeira submissão):
   - usuário sem `password` → `{ success:true, isFirstAccess:true, userCPF }`
   - usuário com `password` → `{ success:true, needsPassword:true, userCPF }`
5. **Senha informada**:
   - usuário sem hash salvo → `{ success:false, error:'CPF ou senha inválidos' }`
   - `bcrypt.compare(senha, hash)` falhou → `'CPF ou senha inválidos'` *(mensagem genérica proposital)*
6. Sucesso: grava `lastLogin`, gera JWT, seta cookie (4.2) e executa `redirect('/dashboard')`.

### 5.3. Comportamento da UI ligado às respostas

- `useEffect` sobre `loginState`:
  - `isFirstAccess` → mostra etapa B com modo criação de senha.
  - `needsPassword` → mostra etapa B com modo senha normal.
  - `error` → garante retorno à visão A (esconde etapa B).
- Erros de login renderizam `<Alert variant="destructive">` inline dentro do card.
- Botões usam `useFormStatus()`: enquanto `pending`, ficam desabilitados com spinner `Loader2` e texto alternativo ("Entrando...", "Definindo Senha...", "Solicitando...").

---

## 6. Primeiro Acesso — Criação de Senha

### 6.1. Cenários que disparam o fluxo

1. **Usuário recém-criado** pelo admin (criado sem senha).
2. **Admin limpo a senha** do usuário (fluxo da seção 7).

Em ambos, o banco não tem hash → `loginAction` responde `isFirstAccess: true`.

### 6.2. Contrato da `setPasswordAction`

```typescript
async function setPasswordAction(prevState, formData): Promise<{ success: boolean; error?: string }>
// FormData esperado:
//   cpf                → CPF (com ou sem máscara)
//   password           → nova senha
//   confirmPassword    → confirmação (obrigatória quando flag ativa)
//   isFirstAccessFlag  → 'true' | 'false' (hidden input enviado pela UI)
```

Validações, em ordem:

1. Campos obrigatórios: `cpf`, `password` e — se `isFirstAccessFlag === 'true'` — `confirmPassword` → `'Todos os campos são obrigatórios.'`
2. Se flag ativa: `password !== confirmPassword` → `'As senhas não coincidem.'`
3. `password.length < 6` → `'A senha deve ter no mínimo 6 caracteres.'`
4. Usuário deve existir → `'Usuário não encontrado.'`
5. Persistência: `hash = bcrypt.hash(password, 12)`; `updateUser(id, { password: hash, passwordResetRequested: false })`.

Respostas da UI:

- `success: true` → esconde etapa B, volta ao formulário de CPF e exibe **toast verde**: *"Senha definida com sucesso! Faça login."*
- `error` → **toast vermelho** com a mensagem (neste formulário o erro vai para toast, não para Alert inline).

> ⚠️ A confirmação de senha só é exigida quando `isFirstAccessFlag` está ativo. Na nova implementação, recomenda-se exigir também complexidade (letras/números/símbolos) — ver seção 12, gap #6.

---

## 7. Redefinição de Senha

Não há e-mail/SMS. O ciclo é **assistido pelo administrador**:

```
USUÁRIO                          SISTEMA                          ADMINISTRADOR
   │                                │                                  │
   │ "Esqueceu a senha?" → informa  │                                  │
   │ CPF em requestPasswordReset ──►│ marca passwordResetRequested=true│
   │◄─ toast "Solicitação enviada.  │                                  │
   │   Um administrador irá         │                                  │
   │   processá-la."                │                                  │
   │                                │── coluna "Redefinição de Senha" ─►│ vê badge "Sim" (vermelho)
   │                                │   na tabela de usuários          │ ação "Limpar Senha"
   │                                │◄── adminClearUserPassword ───────│ confirma no diálogo
   │                                │ password='' e flag=false         │
   │ tenta logar (CPF) ────────────►│ sem senha → isFirstAccess:true   │
   │ define NOVA senha (seção 6) ──►│ hash salvo, flag limpa           │
   │ loga normalmente ─────────────►│ ✓                                │
```

### 7.1. Contrato da `requestPasswordResetAction`

```typescript
async function requestPasswordResetAction(prevState, formData): Promise<{ success: boolean; error?: string }>
// FormData: { cpf }
```

1. `cpf` obrigatório → `'CPF é obrigatório.'`
2. Normaliza dígitos; usuário inexistente/inativo → `'Usuário não encontrado.'`
3. `updateUser(id, { passwordResetRequested: true })`.
4. Retorna `{ success: true, error: 'Solicitação de redefinição de senha enviada. Um administrador irá processá-la.' }`

> ⚠️ Note o **quirk do contrato**: a mensagem de sucesso vem dentro do campo `error`. A UI trata assim: `if (resetState.success && resetState.error)` → `toast.info(...)`. Na nova implementação, usar um campo dedicado (ex.: `message`). Ver seção 12, gap #5.

### 7.2. Contrato da `adminClearUserPasswordAction`

```typescript
async function adminClearUserPasswordAction(userId: string): Promise<{ success: boolean; error?: string }>
```

1. `userId` obrigatório → `'ID do usuário é obrigatório.'`
2. `updateUser(userId, { password: '', passwordResetRequested: false })` — senha vazia força o fluxo de primeiro acesso no próximo login.
3. Toast de sucesso na UI: *"Senha limpa com sucesso! O usuário definirá uma nova senha no próximo login."*

> ⚠️ **Dois gaps aqui:** (a) a action tem `TODO: Add admin permission validation` — qualquer chamada autenticada executa; (b) grava `''` em vez de remover o campo/`null`. Ver seção 12, gaps #2 e #4.

### 7.3. Confirmação no painel admin

Antes de executar, abre diálogo (desktop) ou drawer (mobile):

- Título: **"Confirmar Limpeza de Senha"**
- Texto: *"Tem certeza que deseja limpar a senha do usuário **{nome}**? Ele será forçado a definir uma nova senha no próximo login."*
- Botões: `Cancelar` (outline) e `Limpar Senha` (destructive).

---

## 8. Especificação Visual da Tela de Login

Referência completa: `app/login/page.tsx`. Componentes shadcn/ui usados: `Card`, `Label`, `Input`, `Button`, `Alert`.

### 8.1. Layout raiz

```html
<div class="min-h-screen flex items-center justify-center
            bg-gradient-to-br from-blue-50 to-indigo-100
            dark:from-gray-900 dark:to-gray-800">
  <div class="w-full max-w-md p-6">
    <Card> ... </Card>
  </div>
</div>
```

- Fundo: gradiente diagonal azul-claro → índigo (light) / cinza escuro (dark mode via `next-themes`).
- Card centralizado, largura máxima `max-w-md`, padding interno `p-6`.

### 8.2. Cabeçalho do card

| Elemento | Especificação |
|---|---|
| Logo | `next/image` com `app/assets/logo.png`, 260×260, centralizada, `mb-4`, `priority` |
| Título | `CardTitle` — "PL4K1NH4", `text-2xl font-bold`, centralizado |
| Subtítulo | `CardDescription`, centralizado, dinâmico:<br>• Estado A: *"Entre com seu CPF para acessar o sistema"*<br>• Estados B/C: *"Acesse sua conta"* |

### 8.3. Estado A — Formulário de CPF

| Campo | Especificação |
|---|---|
| Label | "CPF" |
| Input | `type="text"`, placeholder `000.000.000-00`, `maxLength={14}`, `required` |
| Máscara | Aplicada no `onChange`: remove não-dígitos e formata `(\d{3})(\d{3})(\d{3})(\d{2})` → `XXX.XXX.XXX-XX`; o valor limpo (só dígitos) é guardado em estado |
| Erro | `<Alert variant="destructive">` abaixo do campo, acima do botão |
| Botão | Submit full-width "Entrar"; loading: spinner + "Entrando..." |
| Rodapé | Botão link centralizado "Esqueceu a senha?" (`mt-4 text-center`) |

### 8.4. Estado B — Senha / Primeiro acesso

| Elemento | Modo criar senha (`isFirstAccess`) | Modo login normal |
|---|---|---|
| Campo CPF | Input **read-only** com valor formatado, classe `bg-muted` (cinza) | *(idem)* |
| Label senha | "Nova Senha", placeholder "Sua nova senha" | "Senha", placeholder "Sua senha" |
| Confirmar senha | Exibido: label "Confirmar Senha", placeholder "Confirme sua nova senha", `required` | Oculto |
| Hidden input | `isFirstAccessFlag` = `"true"` | `"false"` |
| Botão submit | "Definir Senha" (loading: "Definindo Senha...") | "Entrar" (loading: "Entrando...") |
| Erro | Alert inline (fonte: `setPasswordState.error`) | Alert inline (fonte: `loginState.error`) |
| Navegação | Botão link full-width "Voltar" → limpa flags e CPF, volta ao Estado A | *(idem)* |

O `action` do formulário alterna dinamicamente: `action={isFirstAccess ? setPasswordFormAction : loginFormAction}`.

### 8.5. Estado C — Solicitação de redefinição

Idêntico ao Estado A, com diferenças:

- Input com `id/name="cpf-reset"`, mesma máscara.
- Botão submit "Solicitar Redefinição" (loading: "Solicitando...").
- Botão link "Voltar ao Login".
- Ao abrir este estado, o CPF é limpo (`setCurrentCPF('')`).
- Resultado: `toast.info("Solicitação de redefinição de senha enviada...")` e retorno automático ao Estado A.

### 8.6. Padrões transversais

- **Feedback assíncrono:** todos os botões de submit usam `useFormStatus().pending` → `disabled` + `<Loader2 className="mr-2 h-4 w-4 animate-spin" />`.
- **Toasts (sonner):** sucesso de senha = `toast.success`; erro de senha/redefinição = `toast.error`; confirmação de redefinição = `toast.info`.
- **Erros de login** sempre em Alert inline (nunca toast), erros de senha sempre em toast.

---

## 9. Gestão de Usuários pelo Administrador

Página `/admin` (server component) carrega todos os usuários ativos ordenados por nome e repassa dados + server actions (`onAdd`, `onEdit`, `onDelete`) para o componente cliente `UserManagementClient` → `UserManagementTable`.

### 9.1. Tabela desktop (≥768px)

Colunas: **Nome** · **Função** (Badge Admin/Usuário com ícones Shield/User) · **Créditos** (centralizado; `∞` para admin) · **Criado em** · **Último Login** · **Redefinição de Senha** (Badge `Sim`=destructive / `Não`=secondary) · ações.

Datas formatadas com `date-fns` + locale `ptBR`: `dd/MM/yyyy HH:mm`; ausente = "Nunca".

Menu de ações (dropdown `MoreHorizontal`):

| Ação | Ícone | Condição |
|---|---|---|
| Adicionar Créditos | Coins | Sempre |
| Limpar Senha | KeyRound | Somente se `passwordResetRequested` |
| Editar | Edit | Sempre |
| Excluir | Trash2 (texto destructive) | Sempre |

### 9.2. Layout mobile (<768px)

Cards empilhados com os mesmos dados e botões de ação diretos (sem dropdown). Diálogos viram Drawers (biblioteca `vaul`), alternados por `useMediaQuery("(min-width: 768px)")`.

### 9.3. Formulário Adicionar/Editar usuário

Campos: **Nome** (texto), **CPF** (só dígitos, `maxLength=11`, placeholder `00000000000`), **Função** (Select: "Usuário"/"Administrador"). Validações server-side nas actions: campos obrigatórios e CPF com 11 dígitos; duplicidade de CPF rejeitada no banco (`'Usuário já existe com este CPF'`).

### 9.4. Exclusão

Diálogo de confirmação: *"Tem certeza que deseja excluir o usuário **{nome}**? Esta ação não pode ser desfeita."* Executa soft delete (`isActive: false`).

---

## 10. Segurança e Variáveis de Ambiente

### 10.1. Variáveis necessárias (`.env.local`)

| Variável | Uso no módulo de autenticação |
|---|---|
| `MONGODB_URI` | String de conexão MongoDB (usada em `lib/mongodb.ts`) |
| `JWT_SECRET` | Segredo de assinatura do JWT; ausência derruba a app no startup (throw no import) |

### 10.2. Práticas aplicadas

- Hash bcrypt **custo 12**, sempre server-side; senha nunca trafega para o cliente além do POST do formulário.
- Cookie `httpOnly` + `sameSite=lax` + `secure` em produção.
- Mensagens de erro de login genéricas (`'CPF ou senha inválidos'`) para não revelar qual campo falhou.
- Listagens de usuários nunca expõem o hash.
- Soft delete impede login de contas removidas (filtro `isActive: true` em todas as buscas).

### 10.3. Melhorias recomendadas para a nova implementação

- Rate limiting / bloqueio temporário após N tentativas falhas por CPF e por IP.
- Rotação e revogação de tokens (lista de invalidação ou versão de sessão no payload).
- Auditoria de eventos de autenticação (login, reset solicitado, senha limpa) em collection própria.
- Expiração mais curta com refresh token, se o novo sistema exigir maior rigor.

---

## 11. Análise do PASSWORD_IMPLEMENTATION_PLAN.md (Aproveitável)

O plano existente foi auditado contra o código. Conclusão: **serve como baseline de requisitos já validados**, com ressalvas.

### 11.1. Itens implementados e confirmados no código (aproveitar como especificação)

| Item do plano | Status real | Evidência |
|---|---|---|
| 1.2 `passwordResetRequested` no schema | ✅ Feito | `lib/auth.ts:21` |
| 2.1 Login em duas fases (CPF → senha/primeiro acesso) + JWT | ✅ Feito | `actions/auth-actions.ts:10-65` |
| 2.2 `setPassword` com validação e hash | ✅ Feito | `auth-actions.ts:73-119` |
| 2.3 `requestPasswordReset` marcando flag | ✅ Feito | `auth-actions.ts:121-143` |
| 2.4 `adminClearUserPassword` | ⚠️ Feito **sem** validação de permissão | `auth-actions.ts:145-161` |
| 3.x UI multi-etapas + "Esqueceu a senha?" | ✅ Feito | `app/login/page.tsx` |
| 4.x Painel admin com coluna de redefinição + limpar senha | ✅ Feito | `UserManagementTable.tsx` |
| 5.1 bcrypt server-side | ✅ Feito (cost 12) | `lib/auth.ts:24-26` |
| 5.2 Validação mínima de senha | ⚠️ Parcial (apenas tamanho ≥ 6) | `auth-actions.ts:97-99` |
| 5.3 Erros genéricos | ✅ Feito no login | `auth-actions.ts:50` |
| 5.4 JWT em httpOnly cookie com expiração | ✅ Feito | `auth-actions.ts:57-62` |

### 11.2. Discrepâncias encontradas no plano

1. **Item 1.1 (campo `password`) está desmarcado** no plano, mas está implementado (`lib/auth.ts:17` + hashing). Pode ser marcado como concluído.
2. **Seção 6 (Testes) inteira marcada como concluída**, porém **não existe nenhum arquivo de teste** no repositório (nenhum `*.test.*`/`*.spec.*`). Os cenários descritos (primeiro acesso, senha incorreta, bypass, injeção) continuam válidos como especificação de testes a criar.
3. **Seção 7 (documentar GEMINI.md)** marcada como feita — verificar se o conteúdo reflete o fluxo atual.

### 11.3. Requisitos do plano ainda pendentes (carregar para o novo sistema)

- Complexidade de senha (letras + números + símbolos) — planejado no item 5.2, nunca implementado.
- Notificação ao admin quando uma redefinição for solicitada (item 2.3 marcado como opcional).
- Logs de segurança server-side de tentativas falhas (item 5.3, segunda parte).

---

## 12. Gaps Conhecidos a Corrigir na Nova Implementação

Ordenados por severidade. Estes itens também foram registrados em `BACKLOG.md` e `TASKS.md`.

| # | Severidade | Gap | Referência | Correção recomendada |
|:-:|---|---|---|---|
| 1 | 🔴 Alta | `/admin` **sem guarda server-side de role** — qualquer usuário autenticado acessa a URL diretamente; a proteção é só o item oculto no menu | `app/(main)/admin/page.tsx` | No início do server component: buscar usuário do token e `redirect('/')` se `role !== 'admin'` (ou validar no middleware decodificando o JWT) |
| 2 | 🔴 Alta | `adminClearUserPasswordAction` **sem validação de permissão** (há um `TODO` no código) — qualquer chamada executa a limpeza | `actions/auth-actions.ts:146` | Decodificar token do cookie e recusar se `role !== 'admin'` |
| 3 | 🔴 Alta | **Logs de senha em texto plano** no console do servidor | `actions/auth-actions.ts:45-47` e `110-111` | Remover todos os `console.log` que imprimem `password`/hash |
| 4 | 🟡 Média | Senha "limpa" gravada como string vazia `''` em vez de remover o campo (`$unset`) ou `null` | `actions/auth-actions.ts:155` | Usar `$unset: { password: '' }` ou `password: null`; manter a semântica "sem senha = primeiro acesso" |
| 5 | 🟡 Média | Contrato inconsistente: `requestPasswordResetAction` devolve mensagem de **sucesso** dentro do campo `error` | `actions/auth-actions.ts:138` | Introduzir campo `message` no tipo de retorno e ajustar a UI |
| 6 | 🟢 Baixa | Política de senha fraca: apenas comprimento mínimo 6; plano original pedia letras/números/símbolos | `actions/auth-actions.ts:97-99` | Validador de complexidade + medidor de força na UI |

---

## 13. Checklist de Reimplementação e Mapa de Arquivos

### 13.1. Checklist funcional (nesta ordem)

- [ ] Schema de usuário com todos os campos da seção 2 + índice único em `cpf`
- [ ] Utilitários: `hashPassword` (bcrypt 12), `verifyPassword`, `formatCPF`
- [ ] CRUD de usuários com soft delete e filtro `isActive`
- [ ] `loginAction` com máquina de dois estágios (flags `isFirstAccess`/`needsPassword`)
- [ ] Emissão de JWT + cookie httpOnly (7 dias)
- [ ] Middleware de redirecionamento (matcher excluindo api/assets)
- [ ] Layout autenticado hidratando `AuthContext` server-side
- [ ] Tela de login com 3 estados visuais conforme seção 8
- [ ] `setPasswordAction` (primeiro acesso) com toasts
- [ ] `requestPasswordResetAction` + flag `passwordResetRequested`
- [ ] Painel admin: tabela com coluna "Redefinição de Senha", ação "Limpar Senha" condicional, diálogos de confirmação
- [ ] `adminClearUserPasswordAction` **com guarda de role** (corrigindo gap #2)
- [ ] Guard server-side em `/admin` (corrigindo gap #1)
- [ ] Seed script do admin inicial (dados via env)
- [ ] Logout (limpeza de cookie + redirect)
- [ ] Testes dos cenários: primeiro acesso, login ok/falha, CPF inválido, redefinição completa, limpeza de senha por admin, acesso de `user` a `/admin` (deve bloquear)

### 13.2. Mapa de arquivos de referência no projeto original

| Arquivo | Responsabilidade |
|---|---|
| `lib/auth.ts` | Interface User, hash/verify, todas as queries MongoDB |
| `lib/jwt.ts` | Geração/verificação do token |
| `lib/utils.ts` | `formatCPF` (máscara `XXX.XXX.XXX-XX`) |
| `actions/auth-actions.ts` | Todas as server actions de auth e gestão de usuários |
| `middleware.ts` | Proteção de rotas por presença de cookie |
| `app/login/page.tsx` | Tela de login (3 estados) |
| `app/(main)/layout.tsx` | Hidratação do usuário a partir do cookie |
| `context/AuthContext.tsx` | Contexto cliente de autenticação + logout |
| `components/app/MainLayoutClient.tsx` | Composição Header + Sidebar + conteúdo |
| `components/app/Header.tsx` | Badge de créditos (regra por role), saudação, toggle tema, logout |
| `components/app/Sidebar.tsx` | Navegação condicional por role (desktop/mobile) |
| `app/(main)/admin/page.tsx` | Página admin (server) + actions repassadas como props |
| `components/app/UserManagementTable.tsx` | Tabela/cards de usuários, limpeza de senha, diálogos |
| `scripts/seed-admin.mjs` | Bootstrap do primeiro admin |

---

*Documento gerado a partir da auditoria do código-fonte em agosto/2026. Última revisão dos arquivos de referência: commit corrente de `plakinha_bkp`.*
