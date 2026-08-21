# 03 — Funcionalidades Futuras (Roadmap)

> Catálogo de funcionalidades **que ainda podem ser implementadas**, com prioridade e status.
> Tudo aqui é `🔮 Futuro` ou `🚧 Em andamento` (ver
> [GUIA-DE-ESCRITA.md](./GUIA-DE-ESCRITA.md#35-status-de-funcionalidades)). Quando algo for
> implementado, mova para [02-funcionalidades-implementadas.md](./02-funcionalidades-implementadas.md).

---

## Sumário por eixo

1. [Autenticação e controle de acesso](#1-autenticação-e-controle-de-acesso)
2. [Qualidade e integridade do registro](#2-qualidade-e-integridade-do-registro)
3. [Produtividade do policial](#3-produtividade-do-policial)
4. [Relatórios e gestão](#4-relatórios-e-gestão)
5. [Técnica e escala](#5-técnica-e-escala)

---

## 1. Autenticação e controle de acesso

### 1.1 Autenticação com login (CPF/matrícula + senha)

**Status:** 🔮 Futuro
**Prioridade:** P0
**Requisitos:** RF-11

**Descrição:** restringir `/admin` a usuários autenticados com role `admin`, via JWT + cookie
httpOnly (libs `jsonwebtoken` e `bcryptjs` já instaladas). Coleção `users` planejada em
[05-modelagem-de-dados.md](./05-modelagem-de-dados.md#4-coleção-users-fase-futura).

**Impacto técnico:**
- `lib/auth.ts` e `lib/jwt.ts` (novos)
- `middleware.ts` protegendo apenas `/admin`
- Telas de login no `app/(auth)/...`
- Seed de admin em `scripts/seed-admin.mjs`

**Passos sugeridos:**
1. Criar `lib/jwt.ts` (assinar/verificar JWT) e `lib/auth.ts` (login, session cookie).
2. Criar `scripts/seed-admin.mjs` para criar o primeiro admin (hash bcrypt).
3. Criar `middleware.ts` que redireciona `/admin` sem sessão válida.
4. Criar página de login e integrar ao layout do admin.

### 1.2 PIN simples para `/admin` (`ADMIN_ACCESS_KEY`)

**Status:** 🔮 Futuro
**Prioridade:** P1
**Requisitos:** RF-11 (mitigação fase 1)

**Descrição:** mitigação leve já na fase 1: tela de PIN no `/admin` exigindo a variável
`ADMIN_ACCESS_KEY` (já presente no `.env.local`). Alternativa provisória à autenticação completa.

### 1.3 Controle por roles (admin / user)

**Status:** 🔮 Futuro
**Prioridade:** P1
**Requisitos:** RF-11

**Descrição:** menu condicional por role (sidebar do projeto de referência) e restrição de ações
(ex.: apenas `admin` exclui registros).

---

## 2. Qualidade e integridade do registro

### 2.1 Compressão/redimensionamento de fotos no cliente

**Status:** 🔮 Futuro
**Prioridade:** P1
**Requisitos:** RNF-03, RNF-04

**Descrição:** redesenhar cada foto em `<canvas>` (~1200px) antes do envio, mantendo cada uma em
~200–400KB. Reduz o body da submissão (importante para limites serverless ~4.5MB) e o tamanho no
banco.

**Impacto técnico:** `components/app/PhotoCapture.tsx` (adicionar pipeline de compressão) ou novo
helper em `lib/`; opcionalmente `sharp` no servidor.

### 2.2 Assinatura digital do policial

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** captura de assinatura via canvas (touch) anexada ao registro como imagem.

### 2.3 Geolocalização

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** registrar latitude/longitude do local da carga (`navigator.geolocation`) no documento.

### 2.4 Registro de devolução vinculado à carga

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** permitir registrar a devolução referenciando a carga (`handoverId`), usando o km
final da carga como km inicial da devolução.

### 2.5 Histórico por placa

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** linha do tempo de todas as cargas de uma viatura (busca por placa).

### 2.6 Imutabilidade + trilha de auditoria

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** registro de quem alterou/excluiu e timestamps de auditoria; impedir edição direta do
registro submetido (edição apenas por admin, com log).

### 2.7 Zoom de fotos no detalhe do registro

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** no detalhe de um registro já salvo (`/admin/[id]`), cada foto poderá ser clicada e
ampliada de forma individual, ocupando a tela, para melhor visualização de detalhes. Hoje as fotos
são exibidas em miniatura (cards do grid em `app/admin/[id]/page.tsx:91`) sem interação.

**Impacto técnico:**
- `app/admin/[id]/page.tsx` — tornar as `<img>` clicáveis e manter o estado da foto ampliada
  (`photos` é o único estado; hoje a página só tem `record` e `loading`)
- Novo componente (ex.: `components/app/PhotoLightbox.tsx`) com overlay em tela cheia
- UI existente: shadcn `Dialog`/`AlertDialog` (base-nova) ou overlay customizado com botão de fechar

**Passos sugeridos:**
1. Criar o componente de ampliação (overlay em tela cheia, fundo escuro, botão fechar).
2. Envolver cada `<img>` de `app/admin/[id]/page.tsx:99` com clique que abre o overlay.
3. Renderizar a foto via `/api/photos/[id]` (mesma rota já usada na miniatura).

**Dependências:** nenhuma (reusa a rota de fotos existente).

---

## 3. Produtividade do policial

### 3.1 QR Code na viatura

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** QR Code fixo na viatura apontando para `/?plate=ABC1D23` (placa pré-preenchida).
Implementação: ler `searchParams.plate` em `app/page.tsx` e pré-popular o campo.

### 3.2 Autocomplete de nomes/matrículas

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** lista pré-cadastrada de policiais no banco para preencher patente/nome/matrícula com
sugestões.

### 3.3 Rascunho offline (PWA + IndexedDB)

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** salvar o formulário em IndexedDB sem internet e sincronizar depois. Base para a
promessa de "offline parcial" do PWA.

### 3.4 Modo câmera único / atalhos de voz

**Status:** 🔮 Futuro
**Prioridade:** P3

**Descrição:** fluxo de captura contínua das 5 fotos em ordem; preenchimento de observações por voz
(Web Speech API).

---

## 4. Relatórios e gestão

### 4.1 Exportação CSV/Excel

**Status:** 🔮 Futuro
**Prioridade:** P1

**Descrição:** botão no admin para exportar todos os registros. Endpoint planejado:
`/api/export`. A action `exportHandoversCSVAction` ainda não existe — será criada quando implementar.

### 4.2 Exportação PDF do checklist

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** relatório oficial com logo, campos e fotos em PDF.

### 4.3 Dashboard com KPIs

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** cargas por dia, % de itens com alteração, top problemas, frota mais problemática.

### 4.4 Relatórios periódicos por e-mail / notificações

**Status:** 🔮 Futuro
**Prioridade:** P3

**Descrição:** envio periódico para supervisores (CRON + e-mail) e notificações web push para
registros com "Com Alteração".

---

## 5. Técnica e escala

### 5.1 Paginação na listagem admin

**Status:** 🔮 Futuro
**Prioridade:** P1

**Descrição:** hoje a listagem está limitada a 200 registros
(`actions/handover-actions.ts:117`). Implementar paginação (cursor/offset) para escalar.

### 5.2 Rate limiting e proteção anti-spam

**Status:** 🔮 Futuro
**Prioridade:** P1
**Requisitos:** RNF-04

**Descrição:** limitar requisições no formulário público (Upstash Ratelimit ou middleware próprio) e
honeypot no formulário.

### 5.3 Migração de fotos para S3/R2

**Status:** 🔮 Futuro
**Prioridade:** P3

**Descrição:** quando o volume crescer, trocar `lib/gridfs.ts` por chamadas a object storage e
armazenar as URLs no documento. Mudança isolada.

### 5.4 Índices no MongoDB

**Status:** 🔮 Futuro
**Prioridade:** P1

**Descrição:** criar índices `handovers.createdAt`, `handovers.plate` e `officer.nome` no Atlas/script
(planejado em [05-modelagem-de-dados.md](./05-modelagem-de-dados.md#3-índices-recomendados)).

### 5.5 Testes automatizados e CI

**Status:** 🔮 Futuro
**Prioridade:** P2

**Descrição:** Vitest (unit: validação Zod, upload GridFS) + Playwright (e2e: preencher → capturar →
salvar → aparecer no admin) + GitHub Actions.

### 5.6 Validação de placa Mercosul completa

**Status:** 🔮 Futuro
**Prioridade:** P3

**Descrição:** validação do formato Mercosul (`ABC1D23`) e antigo (`ABC-1234`) em `lib/utils.ts`.

### 5.7 Monitoramento de erros

**Status:** 🔮 Futuro
**Prioridade:** P3

**Descrição:** Sentry e/ou logs estruturados para rastrear falhas em produção.

### 5.8 Tema institucional customizável

**Status:** 🔮 Futuro
**Prioridade:** P3

**Descrição:** ajuste da cor primária e do tema dark para identidade institucional (hoje usa o tema
Neutral padrão do shadcn).

### 5.9 Integração com API de dados veiculares

**Status:** 🔮 Futuro
**Prioridade:** P3

**Descrição:** consulta de placa → marca/modelo para enriquecer o registro (como no projeto de
referência).

---

## Como priorizar

- **P0** primeiro: autenticação (1.1) — segurança do `/admin`.
- Depois **P1**: compressão de fotos (2.1), exportação CSV (4.1), paginação (5.1), rate limit
  (5.2) e índices (5.4).
- **P2/P3**: conforme necessidade operacional.

Ao iniciar qualquer item, mova-o para `🚧 Em andamento` e, ao concluir, registre em
[02-funcionalidades-implementadas.md](./02-funcionalidades-implementadas.md).