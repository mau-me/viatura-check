# 05 — Modelagem de Dados (MongoDB)

> Documento do modelo de dados do sistema: coleções, GridFS, índices e regras de negócio aplicadas
> na persistência. Base para qualquer trabalho futuro em banco.

---

## 1. Banco de dados

- Nome do banco: `viatura` (definido em `lib/mongodb.ts:31`).
- Conexão: `MONGODB_URI` via variável de ambiente (`lib/mongodb.ts:3`).

## 2. Coleção `handovers` — registros de carga

Estrutura do documento gravado por `submitHandoverAction`
(`actions/handover-actions.ts:86`):

```js
{
  _id: ObjectId,
  plate: "ABC1D23",                 // normalizado: maiúsculas, sem caracteres especiais
  officer: {                          // responsável pela carga (matrícula obrigatória)
    patente: "Sd",
    nome: "João da Silva",
    matricula: "123456"
  },
  deliveringOfficer: {               // entregou a viatura (matrícula opcional)
    patente: "Sgt",
    nome: "Maria Souza",
    matricula: ""                    // pode ser string vazia
  },
  receivingOfficer: {                // recebeu a viatura
    patente: "Sd",
    nome: "João da Silva",
    matricula: ""
  },
  kilometers: {
    initial: 45210,                  // inteiro ≥ 0
    final: 45210                     // inteiro, final ≥ initial
  },
  checklist: {
    oleo_motor:             "ok" | "alteracao",
    arrefecimento:          "ok" | "alteracao",
    pneus:                  "ok" | "alteracao",
    partida_motor:          "ok" | "alteracao",
    freios:                 "ok" | "alteracao",
    identificacao_visual:   "ok" | "alteracao",
    limpeza:                "ok" | "alteracao"
  },
  checklistObservations: {
    oleo_motor: "Nível do óleo abaixo do mínimo"   // só para itens com alteração
  },
  observations: "Outras informações pertinentes...",  // texto livre (até 2000 chars)
  photos: {
    frente:          "ObjectIdGridFS",
    fundo:           "ObjectIdGridFS",
    lateral_esquerda:"ObjectIdGridFS",
    lateral_direita: "ObjectIdGridFS",
    painel:          "ObjectIdGridFS"
  },
  createdAt: ISODate(...),
  updatedAt: ISODate(...)
}
```

### Detalhes

- **Placa:** normalizada antes da validação (`actions/handover-actions.ts:23`) — remove tudo que
  não for alfanumérico e converte para maiúsculas.
- **`checklistObservations`:** sempre presente (objeto), mesmo vazio — `actions/handover-actions.ts:88`.
- **`photos`:** mapeia as 5 posições para o `ObjectId` do arquivo no GridFS.
- **`deliveringOfficer`/`receivingOfficer`:** matrícula pode vir como string vazia (aceita pelo
  schema — `lib/validation.ts:26`).

## 3. GridFS — bucket `photos`

Gerenciado pelo driver (`lib/gridfs.ts`). Gera as coleções:

- `photos.files` — metadados: `filename`, `length`, `chunkSize`, `uploadDate`, `metadata`.
- `photos.chunks` — blocos binários de 255KB.

### Conteúdo do `metadata`

```js
{ contentType: "image/jpeg" }   // gravado no upload (lib/gridfs.ts:12)
```

> O driver mongodb v7 não aceita `contentType` como opção top-level; por isso ele vai em `metadata`.

### Tamanho estimado por registro

5 fotos × ~250KB ≈ 1,25MB (mais o documento do checklist). *Sem compressão no cliente ainda — ver
[03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md#21-compressãoredimensionamento-de-fotos-no-cliente).*

## 4. Índices recomendados

Ainda não criados no banco (roadmap — ver
[03-funcionalidades-futuras.md](./03-funcionalidades-futuras.md#54-índices-no-mongodb)). Sugestão:

```js
db.handovers.createIndex({ createdAt: -1 })      // listagem admin (mais recentes primeiro)
db.handovers.createIndex({ plate: 1 })           // busca por placa
db.handovers.createIndex({ 'officer.nome': 1 })  // busca por nome (futuro)
```

## 5. Coleção `users` (FASE FUTURA — autenticação)

Planejada para a autenticação com roles (RF-11). Não existe no banco ainda.

```js
{
  _id: ObjectId,
  cpf: "06468856507",          // ou matricula
  name: "Nome",
  email: "email@exemplo.com",
  role: "admin" | "user",
  credits: 0,
  password: "<hash bcrypt>",   // bcryptjs
  isActive: true,
  createdAt: Date,
  lastLogin: Date,
  passwordResetRequested: false
}
```

## 6. Regras de negócio na persistência

1. Placa/prefixo obrigatório, normalizada em maiúsculas (sem caracteres especiais).
2. Kilometragem final **≥** inicial (refine do Zod — `lib/validation.ts:43`).
3. Todos os 7 itens do checklist devem ter status `ok` ou `alteracao` (enforced no loop de
   `actions/handover-actions.ts:53`).
4. As 5 fotos são obrigatórias; tamanho máximo por foto = `MAX_PHOTO_SIZE_MB` (padrão 2MB).
5. "Com Alteração" **não exige** observação obrigatória no schema atual (pode ficar vazia).
6. Registro é imutável após submissão na fase atual (sem edição).
7. Exclusão remove primeiro as fotos do GridFS e depois o documento — `actions/handover-actions.ts:157`.