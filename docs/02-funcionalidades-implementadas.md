# 02 — Funcionalidades Implementadas

> Registro de todas as funcionalidades **já existentes** no sistema, organizadas por módulo, com
> referência real aos arquivos do código. Tudo aqui está `✅ Implementado`.

---

## Sumário

1. [Dashboard do policial (`/`)](#1-dashboard-do-policial-)
2. [Carga de viatura (`/carga`)](#2-carga-de-viatura-carga)
3. [Devolução de viatura (`/devolucao/[id]`)](#3-devolução-de-viatura-devolucãoid)
4. [Captura de fotos](#4-captura-de-fotos)
5. [Checklist de verificação](#5-checklist-de-verificação)
6. [Submissão e persistência (Server Actions + GridFS)](#6-submissão-e-persistência-server-actions--gridfs)
7. [Página de sucesso (`/sucesso`)](#7-página-de-sucesso-succes)
8. [Autenticação e login](#8-autenticação-e-login)
9. [Administração (`/admin`)](#9-administração-admin)
10. [Detalhe do registro (`/admin/[id]`)](#10-detalhe-do-registro-adminid)
11. [Gerenciamento de usuários](#11-gerenciamento-de-usuários)
12. [Servir fotos via API (`/api/photos/[id]`)](#12-servir-fotos-via-api-apiphotosid)
13. [PWA e tema](#13-pwa-e-tema)

---

## 1. Dashboard do policial (`/`)

**Status:** ✅ Implementado
**Requisitos:** RF-01, RF-11
**Acesso:** autenticado

**O que faz:** a rota `/` exibe o dashboard do policial logado. Mostra:
- Card com viatura em aberto (se houver) + botão "Devolver Viatura"
- Botão "Nova Carga" (desabilitado se viatura em aberto)
- Lista de registros anteriores do policial (histórico)

**Arquivos:**
- `app/page.tsx` — server wrapper com autenticação
- `components/app/UserDashboardClient.tsx` — client component do dashboard

**Regras de negócio:**
- Um policial não pode ter mais de 1 viatura em aberto simultaneamente
- A viatura em aberto é exibida com placa, km inicial e data da carga

---

## 2. Carga de viatura (`/carga`)

**Status:** ✅ Implementado
**Requisitos:** RF-01, RF-02, RF-03, RF-05, RF-07, RF-08
**Acesso:** autenticado

**O que faz:** formulário de saída da viatura. Divide-se em cards:
- **Viatura** (placa + km inicial — sem km final)
- **Policial que Entregou** (patente + nome — sem matrícula)
- **Verificação** (checklist 7 itens)
- **Fotos** (5 obrigatórias)
- **Observações** (opcional)

**Arquivos:**
- `app/carga/page.tsx` — server wrapper com autenticação
- `components/app/DepartureForm.tsx` — client component do formulário

**Detalhes:**
- O policial logado é registrado automaticamente como `departureOfficer` (matrícula do login)
- Verificação: policial não pode criar carga se já tem viatura em aberto
- Verificação: viatura não pode ter registro aberto (por qualquer policial)
- Após submit → redirect para `/sucesso?id=<id>&phase=departure`

---

## 3. Devolução de viatura (`/devolucao/[id]`)

**Status:** ✅ Implementado
**Requisitos:** RF-01, RF-02
**Acesso:** autenticado (apenas o policial que fez a carga)

**O que faz:** formulário de retorno da viatura. Divide-se em:
- Dados da carga (placa + km inicial — read-only)
- **Km Final** (obrigatório, ≥ km inicial)
- **Policial que Recebeu** (patente + nome)
- **Fotos** (5 obrigatórias — mesmas posições)
- **Observações** (opcional)

**Arquivos:**
- `app/devolucao/[id]/page.tsx` — server wrapper com autenticação
- `components/app/ReturnForm.tsx` — client component do formulário

**Detalhes:**
- Verificação: registro deve existir, estar aberto, e pertencer ao policial logado
- Após submit → redirect para `/sucesso?id=<id>&phase=return`

---

## 4. Captura de fotos

**Status:** ✅ Implementado
**Requisitos:** RF-08, RNF-01, RNF-04

**O que faz:** exibe áreas de captura (Frente, Fundo, Lateral Esquerda, Lateral Direita, Painel).
No celular abre a câmera traseira (`capture="environment"`); também permite escolher da galeria.
Há pré-visualização antes do envio e botão para remover a foto.

**Arquivos:**
- `components/app/PhotoCapture.tsx` — componente de captura
- `lib/validation.ts` — constante `PHOTO_KEYS` (define as 5 posições e labels)

**Uso:**
- Na carga: 5 fotos com prefixo `photo_`
- Na devolução: 5 fotos com prefixo `return_photo_`

---

## 5. Checklist de verificação

**Status:** ✅ Implementado
**Requisitos:** RF-05, RF-06

**O que faz:** apresenta os 7 itens do checklist com seleção **OK** ou **Com Alteração** (radio
group). Quando "Com Alteração" é selecionado, exibe uma caixa de texto para descrever a alteração.

**Arquivos:**
- `components/app/ChecklistItem.tsx` — item do checklist (radio + textarea condicional)
- `lib/validation.ts` — constante `CHECKLIST_ITEMS` (7 itens e labels)

**Itens do checklist:**
1. Óleo do Motor (`oleo_motor`)
2. Arrefecimento (`arrefecimento`)
3. Condições dos Pneus (`pneus`)
4. Partida e Funcionamento do Motor (`partida_motor`)
5. Freios (`freios`)
6. Identificação Visual (`identificacao_visual`)
7. Limpeza (`limpeza`)

---

## 6. Submissão e persistência (Server Actions + GridFS)

**Status:** ✅ Implementado
**Requisitos:** RF-09, RNF-04, RNF-05

**Server Actions:**

| Action | Descrição |
|---|---|
| `createDepartureAction(formData)` | Cria registro de carga (status "aberto") |
| `completeReturnAction(id, formData)` | Finaliza devolução (status "fechado") |
| `adminCloseHandoverAction(id)` | Admin fecha registro em aberto |
| `getOpenHandoverByOfficer(matricula)` | Busca registro aberto de um policial |
| `getHandoversAction(query?, status?)` | Lista registros com filtro |
| `getHandoverByIdAction(id)` | Retorna registro completo |
| `deleteHandoverAction(id)` | Exclui registro e fotos |

**Arquivos:**
- `actions/handover-actions.ts` — todas as actions
- `lib/validation.ts` — schemas `departureSchema` e `returnSchema`
- `lib/mongodb.ts` — `connectToDatabase()`
- `lib/gridfs.ts` — `uploadPhoto`, `deletePhoto`

**Regras de negócio:**
- Um policial = uma viatura (não pode ter 2 abertas)
- Uma viatura = um registro aberto
- Km final ≥ Km inicial
- Fotos obrigatórias nas duas fases (5 + 5)
- Admin pode fechar registros em aberto

---

## 7. Página de sucesso (`/sucesso`)

**Status:** ✅ Implementado
**Requisitos:** RF-09

**Query params:** `?id=<ObjectId>&phase=departure|return`

**O que faz:** exibe mensagem conforme a fase:
- **Carga:** "Carga registrada!" + lembrete de devolução
- **Devolução:** "Devolução registrada!"

**Arquivos:**
- `app/sucesso/page.tsx`

---

## 8. Autenticação e login

**Status:** ✅ Implementado
**Requisitos:** RF-11

**O que faz:** sistema completo de autenticação com fluxo 3 estados:
- Estado A: matricula → verificar se existe
- Estado B: senha (login) ou primeiro acesso (criar senha)
- Estado C: solicitação de reset de senha

**Arquivos:**
- `app/login/page.tsx` — página de login (3 estados)
- `lib/jwt.ts` — JWT utilities (jose, edge-compatible)
- `lib/auth.ts` — CRUD de usuários, bcrypt
- `actions/auth-actions.ts` — server actions de auth
- `components/app/AuthContext.tsx` — contexto de autenticação
- `components/app/SessionProvider.tsx` — provider de sessão
- `middleware.ts` — proteção de rotas

**Regras:**
- Cookie `viatura_session` (httpOnly, sameSite, secure)
- Todas as rotas protegidas exceto `/login`, `api`, static assets
- Admin só acessa `/admin`

---

## 9. Administração (`/admin`)

**Status:** ✅ Implementado
**Requisitos:** RF-10, RNF-01, RNF-07
**Acesso:** admin apenas

**O que faz:** duas tabs:
- **Registros:** lista com filtro (Todos / Em Aberto / Fechados), busca, exclusão, fechamento
- **Usuários:** CRUD de usuários

**Arquivos:**
- `app/admin/page.tsx` — server page com tabs
- `app/admin/layout.tsx` — server layout com role guard
- `components/app/AdminLayoutClient.tsx` — admin shell
- `components/app/AdminRecordsClient.tsx` — listagem de registros
- `components/app/UserManagementClient.tsx` — gerenciamento de usuários

---

## 10. Detalhe do registro (`/admin/[id]`)

**Status:** ✅ Implementado
**Requisitos:** RF-10, RNF-07
**Acesso:** admin apenas

**O que faz:** exibe o registro completo com duas seções:
- **Carga (Saída):** policial, quem entregou, km inicial, checklist, fotos, observações
- **Devolução (Entrada):** policial que recebeu, km final, fotos, observações

**Arquivos:**
- `app/admin/[id]/page.tsx` — server wrapper com role guard
- `components/app/HandoverDetailClient.tsx` — client component do detalhe

---

## 11. Gerenciamento de usuários

**Status:** ✅ Implementado
**Requisitos:** RF-11
**Acesso:** admin apenas

**O que faz:** CRUD completo de usuários com:
- Tabela (desktop) e cards (mobile) — responsivo
- Formulário em Dialog (desktop) / Drawer (mobile)
- Busca por nome, matrícula ou patente
- Exclusão com confirmação (AlertDialog)
- Toggle de status ativo/inativo

**Arquivos:**
- `components/app/UserManagementClient.tsx` — orchestrador
- `components/app/UserForm.tsx` — formulário (Dialog/Drawer)
- `components/app/UserTable.tsx` — tabela desktop
- `components/app/UserCard.tsx` — card mobile
- `hooks/use-media-query.tsx` — detecção responsiva

---

## 12. Servir fotos via API (`/api/photos/[id]`)

**Status:** ✅ Implementado
**Requisitos:** RNF-04

**O que faz:** route handler que lê uma foto do GridFS pelo `ObjectId` e a devolve com o
`Content-Type` correto e cache de 1 ano (`immutable`).

**Arquivos:**
- `app/api/photos/[id]/route.ts`
- `lib/gridfs.ts` — `getPhoto`

---

## 13. PWA e tema

**Status:** ✅ Implementado
**Requisitos:** RNF-02, RNF-07

**O que faz:** o app é instalável como PWA (manifest + service worker) e suporta tema claro/escuro
via `next-themes` (padrão: sistema).

**Arquivos:**
- `next.config.mjs` — configuração do `next-pwa`
- `public/manifest.json` — manifesto PWA
- `public/icon-192.png`, `public/icon-512.png` — ícones
- `app/layout.tsx` — `<ThemeProvider>`, `<Toaster />`, metas PWA

---

## Componentes de UI disponíveis (shadcn/ui)

Todos em `components/ui/`:

`alert`, `alert-dialog`, `avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `drawer`,
`dropdown-menu`, `input`, `label`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`,
`skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`.
