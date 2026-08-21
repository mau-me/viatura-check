# 01 — Visão Geral

> Documento de contexto do sistema `viatura-check`: o que é, para quem serve e quais são as
> características essenciais. Leitura recomendada para qualquer pessoa que chega ao projeto.

---

## 1. O que é

Sistema web **mobile-first** para registro de **carga de viatura** — o checklist das condições de um
veículo no momento em que um policial assume a posse dele. O policial preenche o formulário pelo
navegador do celular, anexa **5 fotos** e envia o registro para um banco MongoDB.

Existe também uma área de **administração** para visualizar, buscar, detalhar e excluir os registros
enviados.

## 2. Público-alvo

- **Policiais militares em serviço**, usando quase exclusivamente **smartphones**.
- **Supervisores/administradores** que consultam e gerenciam os registros.

## 3. Características essenciais

- **Web, sem instalação** — não é app nativo; funciona em qualquer navegador moderno.
- **Mobile-first** — telas e componentes desenhados para celular, com aperfeiçoamento progressivo
  para desktop.
- **Sem login na fase 1** — o link principal (`/`) já abre o formulário.
- **Submissão no MongoDB** — dados do checklist + fotos (GridFS).
- **Área administrativa (`/admin`)** — acessível por link direto na fase 1; no futuro, restrita a
  usuários com role `admin`.
- **PWA** — instalável, ícone na home, suporte offline parcial.

## 4. Requisitos funcionais (resumo)

| Código | Requisito |
|---|---|
| RF-01 | Tela principal (`/`) é o formulário de carga, sem login |
| RF-02 | Identificação da viatura: placa/prefixo obrigatório |
| RF-03 | Identificação de 3 policiais: responsável, entregou, recebeu |
| RF-04 | Kilometragem inicial e final (final ≥ inicial) |
| RF-05 | Checklist de 7 itens com OK / Com Alteração |
| RF-06 | Observação opcional por item com alteração |
| RF-07 | Campo "Outras informações pertinentes" |
| RF-08 | Envio de 5 fotos obrigatórias (câmera/galeria) |
| RF-09 | Persistência no MongoDB + fotos no GridFS |
| RF-10 | Tela `/admin`: listar, buscar, detalhar e excluir registros |
| RF-11 | (Futuro) `/admin` restrito a role `admin` |

## 5. Requisitos não funcionais (resumo)

| Código | Requisito |
|---|---|
| RNF-01 | Mobile-first, alvos de toque ≥ 44–48px, teclados corretos |
| RNF-02 | Web sem instalação; PWA como melhoria |
| RNF-03 | Performance: bundle pequeno, fotos comprimidas no cliente |
| RNF-04 | Segurança: validação Zod no servidor, limite de arquivo |
| RNF-05 | Conexão MongoDB singleton com erro amigável |
| RNF-06 | Acessibilidade: labels, contraste, navegação por teclado |
| RNF-07 | Tudo em PT-BR; datas com locale `ptBR` |
| RNF-08 | Escalabilidade inicial (dezenas/centenas de registros/dia) |

## 6. Detalhamento

- Funcionalidades já existentes: [02-funcionalidades-implementadas.md](./02-funcionalidades-implementadas.md)
- O que ainda pode ser feito: [03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md)