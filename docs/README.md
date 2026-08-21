# Documentação — Controle de Carga/Devolução de Viatura

> Portal da documentação técnica do sistema `viatura-check` (Next.js 14 + MongoDB). Este índice
> organiza todos os arquivos em `docs/` e orienta quem precisa consultar ou escrever documentação.

---

## Como navegar

| Arquivo | O que contém | Para quem |
|---|---|---|
| [GUIA-DE-ESCRITA.md](./GUIA-DE-ESCRITA.md) | Diretrizes para escrever/atualizar a documentação | Todos que vão editar `docs/` |
| [01-visao-geral.md](./01-visao-geral.md) | O que o sistema é, público-alvo, características | Stakeholders e novos devs |
| [02-funcionalidades-implementadas.md](./02-funcionalidades-implementadas.md) | Tudo que **já funciona**, por módulo | Devs, QA, revisores |
| [03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md) | Roadmap de **ideias futuras**, prioridades | Produto e arquitetura |
| [04-arquitetura.md](./04-arquitetura.md) | Stack, decisões, estrutura de pastas, padrões | Devs |
| [05-modelagem-de-dados.md](./05-modelagem-de-dados.md) | MongoDB: coleções, GridFS, índices, regras | Devs back-end |
| [06-rotas-e-api.md](./06-rotas-e-api.md) | Páginas, Server Actions e route handlers | Devs full-stack |
| [07-guia-de-desenvolvimento.md](./07-guia-de-desenvolvimento.md) | Setup, comandos, variáveis, deploy | Devs e operações |

---

## Estado atual do sistema

- **Fase:** 1 (funcional) — formulário público, admin por link direto, sem autenticação.
- **Funcionalidades implementadas:** veja [02-funcionalidades-implementadas.md](./02-funcionalidades-implementadas.md).
- **Pendências/ideias:** veja [03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md).

## Leitura recomendada para novos desenvolvedores

1. [01-visao-geral.md](./01-visao-geral.md) — entender o domínio.
2. [04-arquitetura.md](./04-arquitetura.md) — entender a stack e os padrões.
3. [02-funcionalidades-implementadas.md](./02-funcionalidades-implementadas.md) — ver o que já existe.
4. [GUIA-DE-ESCRITA.md](./GUIA-DE-ESCRITA.md) — antes de **escrever** qualquer documento novo.

---

## Como manter

Ao implementar ou alterar qualquer funcionalidade, siga o processo descrito na seção 7 do
[GUIA-DE-ESCRITA.md](./GUIA-DE-ESCRITA.md). Em resumo: **código e documentação mudam juntos**.