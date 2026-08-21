# 02 — Funcionalidades Implementadas

> Registro de todas as funcionalidades **já existentes** no sistema, organizadas por módulo, com
> referência real aos arquivos do código. Tudo aqui está `✅ Implementado` (ver
> [GUIA-DE-ESCRITA.md](./GUIA-DE-ESCRITA.md#35-status-de-funcionalidades)).

---

## Sumário

1. [Formulário público de carga (`/`)](#1-formulário-público-de-carga-)
2. [Captura de fotos](#2-captura-de-fotos)
3. [Checklist de verificação](#3-checklist-de-verificação)
4. [Submissão e persistência (Server Actions + GridFS)](#4-submissão-e-persistência-server-actions--gridfs)
5. [Página de sucesso (`/sucesso`)](#5-página-de-sucesso-succes)
6. [Administração (`/admin`)](#6-administração-admin)
7. [Detalhe do registro (`/admin/[id]`)](#7-detalhe-do-registro-adminid)
8. [Servir fotos via API (`/api/photos/[id]`)](#8-servir-fotos-via-api-apiphotosid)
9. [PWA e tema](#9-pwa-e-tema)

---

## 1. Formulário público de carga (`/`)

**Status:** ✅ Implementado
**Requisitos:** RF-01, RF-02, RF-03, RF-04, RF-07, RNF-01, RNF-06, RNF-07

**O que faz:** a rota `/` exibe, sem login, o formulário completo de carga. É dividido em cards por
seção: **Viatura** (placa + kilometragem), **Policiais** (responsável, entregou, recebeu),
**Verificação** (checklist), **Fotos** (5) e **Observações**.

**Arquivos:**
- `app/page.tsx` — página client do formulário, gerencia estado das fotos e submissão
- `components/app/OfficerFields.tsx` — campos de patente, nome e matrícula (reutilizado 3×)
- `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `components/ui/button.tsx` — primitivas de UI

**Detalhes de comportamento:**
- Placa/prefixo normalizado no servidor (maiúsculas, sem caracteres especiais) — `actions/handover-actions.ts:23`.
- Matrícula **obrigatória** apenas para o responsável pela carga — `components/app/OfficerFields.tsx:30`.
- Botão de envio fica `sticky bottom-4` (sempre visível no celular) e mostra estado de loading
  (`Loader2`) durante o envio — `app/page.tsx:146`.
- Inputs numéricos usam `type="number"` + `inputMode="numeric"` (teclado correto no celular).

---

## 2. Captura de fotos

**Status:** ✅ Implementado
**Requisitos:** RF-08, RNF-01, RNF-04

**O que faz:** exibe 5 áreas de captura (Frente, Fundo, Lateral Esquerda, Lateral Direita, Painel),
uma por foto obrigatória. No celular abre a câmera traseira (`capture="environment"`); também
permite escolher da galeria. Há pré-visualização antes do envio e botão para remover a foto.

**Arquivos:**
- `components/app/PhotoCapture.tsx` — componente de captura
- `lib/validation.ts:13` — constante `PHOTO_KEYS` (define as 5 posições e labels)

**Detalhes de comportamento:**
- Ao selecionar um arquivo, gera `URL.createObjectURL` para pré-visualização e revoga o objeto
  anterior (evita vazamento de memória) — `app/page.tsx:27`.
- O arquivo só é anexado ao `FormData` na hora do submit — `app/page.tsx:38`.

> **Pendência conhecida (futuro):** as fotos **não são comprimidas/redimensionadas no cliente**
> ainda. Ver [03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md) — Compressão de fotos.

---

## 3. Checklist de verificação

**Status:** ✅ Implementado
**Requisitos:** RF-05, RF-06

**O que faz:** apresenta os 7 itens do checklist com seleção **OK** ou **Com Alteração** (radio
group). Quando "Com Alteração" é selecionado, exibe uma caixa de texto para descrever a alteração.

**Arquivos:**
- `components/app/ChecklistItem.tsx` — item do checklist (radio + textarea condicional)
- `lib/validation.ts:3` — constante `CHECKLIST_ITEMS` (7 itens e labels)

**Itens do checklist (constante `CHECKLIST_ITEMS`):**
1. Óleo do Motor (`oleo_motor`)
2. Arrefecimento (`arrefecimento`)
3. Condições dos Pneus (`pneus`)
4. Partida e Funcionamento do Motor (`partida_motor`)
5. Freios (`freios`)
6. Identificação Visual (`identificacao_visual`)
7. Limpeza (`limpeza`)

---

## 4. Submissão e persistência (Server Actions + GridFS)

**Status:** ✅ Implementado
**Requisitos:** RF-09, RNF-04, RNF-05

**O que faz:** ao submeter, o cliente monta um `FormData` (campos + fotos) e chama a Server Action
`submitHandoverAction`. O servidor normaliza a placa, valida com Zod, faz upload das 5 fotos para o
GridFS e grava um documento na coleção `handovers`.

**Arquivos:**
- `actions/handover-actions.ts:21` — `submitHandoverAction` (submissão)
- `lib/validation.ts:33` — `handoverSchema` (validação Zod)
- `lib/mongodb.ts` — `connectToDatabase()` (conexão singleton)
- `lib/gridfs.ts:5` — `uploadPhoto` (upload para GridFS)

**Validações do servidor (`lib/validation.ts`):**
- Placa/prefixo: obrigatório, 3–15 caracteres, normalizado em maiúsculas sem símbolos.
- Kilometragem: numérica inteira ≥ 0; **final ≥ inicial** (refine do Zod).
- Matrícula do responsável: obrigatória; demais: opcional.
- Checklist: cada item deve ser `ok` ou `alteracao` (enforced no loop de `handover-actions.ts:53`).
- Observação por item: máx. 500 caracteres; "Outras informações": máx. 2000.

**Fotos:**
- Obrigatórias (todas as 5); retorna erro se faltar alguma — `actions/handover-actions.ts:73`.
- Tamanho máximo por foto: `MAX_PHOTO_SIZE_MB` (padrão 2 MB) — `actions/handover-actions.ts:9`.
- Upload com nome `${plate}_${key}.jpg` e contentType em `metadata` — `lib/gridfs.ts:12`.

**Fluxo resumido:**
1. Cliente monta `FormData` e chama a action via `useTransition` — `app/page.tsx:43`.
2. Servidor normaliza e valida os dados (Zod).
3. Faz upload das 5 fotos no bucket GridFS `photos`.
4. Insere o documento em `handovers` com `createdAt`/`updatedAt`.
5. Revalida a rota `/admin` e retorna `{ success: true, id }`.
6. Cliente exibe toast de sucesso e redireciona para `/sucesso?id=...`.

**Modelo de dados completo:** [05-modelagem-de-dados.md](./05-modelagem-de-dados.md)

---

## 5. Página de sucesso (`/sucesso`)

**Status:** ✅ Implementado
**Requisitos:** RF-09

**O que faz:** página de confirmação após a submissão. Exibe o identificador do registro (via
`?id=...`) e oferece botões "Nova Carga" e "Ver registros (admin)".

**Arquivos:**
- `app/sucesso/page.tsx`

---

## 6. Administração (`/admin`)

**Status:** ✅ Implementado
**Requisitos:** RF-10, RNF-01, RNF-07

**O que faz:** lista os registros enviados (mais recentes primeiro, limite de 200), com busca por
placa ou nome do responsável, exclusão com confirmação (`AlertDialog`) e navegação para o detalhe.
Na fase 1 é acessível **por link direto, sem login**.

**Arquivos:**
- `app/admin/page.tsx` — página de listagem (client)
- `actions/handover-actions.ts:102` — `getHandoversAction` (lista com filtro)
- `actions/handover-actions.ts:150` — `deleteHandoverAction` (exclui registro + fotos)
- `components/ui/alert-dialog.tsx` — diálogo de confirmação de exclusão
- `components/ui/badge.tsx` — badge "Com Alteração"
- `components/ui/skeleton.tsx`, `components/ui/scroll-area.tsx` — componentes disponíveis para UI (alguns ainda não usados)

**Detalhes de comportamento:**
- Busca: filtro `$or` em `plate` e `officer.nome` com regex case-insensitive — `actions/handover-actions.ts:105`.
- Exclusão: remove as 5 fotos do GridFS e depois o documento — `actions/handover-actions.ts:157`.
- Cada card exibe placa, nome/matrícula do responsável, data (formatada com `date-fns` locale `ptBR`)
  e kilometragem; badge "Com Alteração" quando há item alterado.

> **Pendência conhecida (futuro):** sem autenticação/PIN na fase 1 — o `/admin` fica exposto a quem
> souber o link. Ver [03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md) — Autenticação
> e PIN de acesso.

---

## 7. Detalhe do registro (`/admin/[id]`)

**Status:** ✅ Implementado
**Requisitos:** RF-10, RNF-07

**O que faz:** exibe o registro completo: dados dos policiais, kilometragem, observações, checklist
(com observações de itens alterados) e as fotos em galeria (via `/api/photos/[id]`).

**Arquivos:**
- `app/admin/[id]/page.tsx` — página de detalhe (client)
- `actions/handover-actions.ts:137` — `getHandoverByIdAction`

---

## 8. Servir fotos via API (`/api/photos/[id]`)

**Status:** ✅ Implementado
**Requisitos:** RNF-04

**O que faz:** route handler que lê uma foto do GridFS pelo `ObjectId` e a devolve com o
`Content-Type` correto e cache de 1 ano (`immutable`). Valida o formato do ID antes de consultar.

**Arquivos:**
- `app/api/photos/[id]/route.ts`
- `lib/gridfs.ts:25` — `getPhoto`

**Detalhes de comportamento:**
- ID inválido ou foto inexistente → `404`.
- `Cache-Control: public, max-age=31536000, immutable` (fotos são imutáveis).
- As fotos **só** são servidas por esta API interna (nunca por URL pública arbitrária).

---

## 9. PWA e tema

**Status:** ✅ Implementado
**Requisitos:** RNF-02, RNF-07

**O que faz:** o app é instalável como PWA (manifest + service worker gerado pelo `next-pwa`) e
suporta tema claro/escuro via `next-themes` (padrão: sistema).

**Arquivos:**
- `next.config.mjs` — configuração do `next-pwa` (dest `public`, register, skipWaiting)
- `public/manifest.json` — manifesto PWA (nome, ícones 192/512, standalone)
- `public/icon-192.png`, `public/icon-512.png` — ícones gerados
- `public/sw.js` — service worker gerado pelo `next-pwa` em build
- `app/layout.tsx` — `<ThemeProvider>` (next-themes), `<Toaster />` (sonner), metas PWA
- `components/ui/sonner.tsx` — wrapper do toaster com tema

**Detalhes de comportamento:**
- Idioma e locale: `lang="pt-BR"` no `<html>` — `app/layout.tsx:47`.
- Fontes: Geist (Sans e Mono) locais via `next/font/local` — `app/layout.tsx:8`.
- O Toaster do sonner é montado uma única vez no layout raiz.

---

## Componentes de UI disponíveis (shadcn/ui)

Todos em `components/ui/`, prontos para uso (alguns ainda não utilizados pelas telas atuais):

`alert`, `alert-dialog`, `badge`, `button`, `card`, `checkbox`, `dialog`, `drawer`, `input`, `label`,
`radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `switch`,
`table`, `textarea`.

> Padrão do projeto: em mobile usar `Drawer` (abre de baixo) e em desktop `Dialog`/`AlertDialog`
> (ver `hooks/use-media-query.tsx` — ainda não criado). Ver
> [04-arquitetura.md](./04-arquitetura.md).