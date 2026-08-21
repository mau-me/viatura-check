# GUIA DE ESCRITA — Documentação do Sistema de Controle de Carga/Devolução de Viatura

> **Arquivo-base de referência.** Todo arquivo futuro desta documentação DEVE seguir as diretrizes
> aqui definidas. Este documento é a fonte de verdade para **como** documentar; os demais arquivos
> em `docs/` definem **o que** está documentado.

---

## 1. Objetivo da documentação

Manter um registro vivo e confiável do sistema `viatura-check`, cobrindo:

1. O que **está implementado** (funcionalidades reais, com referência de arquivo).
2. O que **pode ser implementado** (ideias, roadmap e decisões pendentes).
3. **Como** o sistema funciona por dentro (arquitetura, dados, rotas, fluxos).
4. **Como** desenvolver, testar e publicar mudanças.

A documentação só é útil se estiver **sincronizada com o código**. Ao alterar o código, atualize os
documentos afetados na mesma entrega.

---

## 2. Estrutura de pastas e numeração

Todo conteúdo vive em `docs/`. Os arquivos seguem a numeração:

| Prefixo | Conteúdo |
|---|---|
| `GUIA-DE-ESCRITA.md` | Este arquivo — diretrizes para escrever/atualizar a documentação (não numerado) |
| `README.md` | Portal/índice: visão geral da documentação e links para todos os arquivos |
| `01-visao-geral.md` | O que o sistema é, público-alvo, características essenciais |
| `02-funcionalidades-implementadas.md` | Tudo que já funciona, por módulo, com referências de código |
| `03-funcionalidades-futuras.md` | Roadmap: ideias, prioridades e status de cada uma |
| `04-arquitetura.md` | Stack, decisões, estrutura de pastas, padrões de código |
| `05-modelagem-de-dados.md` | Coleções MongoDB, GridFS, índices, regras de negócio |
| `06-rotas-e-api.md` | Páginas, Server Actions e route handlers |
| `07-guia-de-desenvolvimento.md` | Setup, comandos, testes, deploy, variáveis de ambiente |
| `NN-*.md` | **Novos arquivos**: use `NN-` sequencial (08, 09, ...) e nome descritivo em `kebab-case` |

### Regras de estrutura

- Um tópico novo e amplo (ex.: "Autenticação", "Relatórios") **merece arquivo próprio** — não
  transforme um arquivo existente em "pegue-tudo".
- Mudanças pequenas entram no arquivo do módulo correspondente.
- Todo arquivo começa com `# NOME DO ARQUIVO` e, logo abaixo, **um parágrafo de contexto** (o que
  este documento cobre e para quem serve).

---

## 3. Convenções de escrita

### 3.1 Idioma

- Tudo em **português brasileiro (PT-BR)**, incluindo comentários, títulos e exemplos.
- Identificadores técnicos (nomes de arquivo, funções, variáveis, rotas, coleções) são escritos
  **como estão no código**, sem traduzir.

### 3.2 Tom e formato

- Markdown GitHub (`#` a `#####`).
- Tabelas para comparar/agrupar (versões, rotas, variáveis, prioridades).
- Listas numeradas para **fluxos/passos** (ex.: fluxo de submissão); listas com `-` para
  enumerações.
- Blocos de código com a linguagem especificada (```ts, ```json, ```bash, ```env).
- Parágrafos curtos e objetivos. Evite rodeios.

### 3.3 Referências a código

**Toda funcionalidade implementada deve indicar onde está no código**, no formato:

```
<arquivo> — <caminho relativo da raiz do projeto>
```

Exemplos:

- `app/page.tsx` — formulário público de carga
- `actions/handover-actions.ts:21` — Server Action `submitHandoverAction` (a linha é opcional;
  inclua quando apontar algo específico)

Regras:

- Use o caminho **relativo à raiz** (`actions/handover-actions.ts`).
- Referencie o **arquivo real**, nunca um arquivo hipotético.
- Se a localização mudar, atualize a referência.

### 3.4 Identificadores de requisitos

O sistema usa requisitos com código (do documento de engenharia `DOCUMENTACAO_PROJETO_VIATURA.md`):

- **RF-01 … RF-11** — Requisitos funcionais (comportamento do sistema).
- **RNF-01 … RNF-08** — Requisitos não funcionais (performance, segurança, acessibilidade...).

Use esses códigos quando um documento precisar referenciar um requisito:

> O formulário público (RF-01) exige placa e kilometragem (RF-04), validadas no servidor (RNF-04).

### 3.5 Status de funcionalidades

Use **um** destes rótulos, de forma consistente:

| Rótulo | Significado |
|---|---|
| `✅ Implementado` | Funciona em produção/dev e está no código |
| `🚧 Em andamento` | Sendo construído agora (parcialmente funcional) |
| `🔮 Futuro` | Planejado/idealizado, ainda não implementado |
| `⛔ Descartado` | Avaliado e não será feito (registre o motivo) |

No arquivo `02-funcionalidades-implementadas.md`, só aparecem itens `✅ Implementado`.
No arquivo `03-funcionalidades-futuras.md`, itens `🔮 Futuro` e `🚧 Em andamento`.

### 3.6 Prioridades (apenas no roadmap)

| Prioridade | Significado |
|---|---|
| `P0` | Crítico — bloqueia uso real ou segurança |
| `P1` | Alta — entrega valor importante |
| `P2` | Média — melhoria relevante |
| `P3` | Baixa — nice-to-have |

---

## 4. Template obrigatório — funcionalidade (implementada)

Ao documentar uma funcionalidade implementada, use este esqueleto:

```markdown
### Nome da funcionalidade

**Status:** ✅ Implementado

**Requisitos:** RF-XX, RNF-YY

**O que faz:** 1–3 frases descrevendo o comportamento real.

**Arquivos:**
- `caminho/do/arquivo.ts` — o que ele faz
- `outro/arquivo.tsx` — o que ele faz

**Fluxo (resumo):**
1. Passo do fluxo.
2. Passo do fluxo.

**Decisões relevantes:** (opcional) por que foi feito assim.
```

## 5. Template obrigatório — funcionalidade futura (roadmap)

```markdown
### Nome da funcionalidade

**Status:** 🔮 Futuro | 🚧 Em andamento

**Prioridade:** P0–P3

**Requisitos:** RF-XX / RNF-YY (ou "—" se novo)

**Descrição:** o que a funcionalidade fará e qual problema resolve.

**Impacto técnico:** o que muda no código/banco/infraestrutura.

**Passos sugeridos:**
1. Passo de implementação.
2. Passo de implementação.

**Dependências:** (opcional) outras funcionalidades ou bibliotecas.
```

---

## 6. O que NUNCA fazer

1. **Não** documentar código que não existe (funcionalidade "implementada" sem arquivo real).
2. **Não** traduzir nomes técnicos ou inventar caminhos de arquivo.
3. **Não** usar "etc.", "entre outros" sem exemplificar quando for referência de código.
4. **Não** duplicar conteúdo entre arquivos sem necessidade — prefira **linkar** (ex.: dados
   detalhados em `05-modelagem-de-dados.md`, resumo no arquivo de funcionalidades).
5. **Não** gravar segredos, URIs reais de banco ou credenciais em nenhum documento versionado.
6. **Não** usar emojis além dos rótulos de status/prioridade definidos na seção 3.5/3.6.
7. **Não** deixar uma mudança de código sem atualizar a documentação correspondente na mesma entrega.

---

## 7. Processo de atualização

### Ao implementar algo novo

1. Adicione a funcionalidade em `02-funcionalidades-implementadas.md` (seção do módulo correto),
   seguindo o template da seção 4.
2. Se a funcionalidade saiu do roadmap, mova o item de `03-funcionalidades-futuras.md` para o
   implementado (ou marque `✅ Implementado` e mova/remova).
3. Atualize arquivos de apoio afetados: `04-arquitetura.md`, `05-modelagem-de-dados.md`,
   `06-rotas-e-api.md`, `07-guia-de-desenvolvimento.md`.

### Ao mudar arquitetura/dados/rotas

- Atualize o documento correspondente **na mesma entrega** que o código.

### Ao revisar (code review / PR)

- Confira se a documentação reflete o código **antes** de aprovar.
- Não é obrigatório aprovar junto — mas o item "documentação atualizada" deve existir.

### Checklist de qualidade

- [ ] Idioma PT-BR e tom objetivo.
- [ ] Referências de arquivo reais e no formato `caminho/arquivo.ts`.
- [ ] Status e prioridade usando os rótulos da seção 3.
- [ ] Template da seção 4/5 respeitado (quando aplicável).
- [ ] Sem segredos/credenciais.
- [ ] Links internos funcionando.
- [ ] `docs/README.md` indexa o arquivo (se novo).