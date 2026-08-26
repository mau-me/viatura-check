# 05 — Modelagem de Dados (MongoDB)

> Documento do modelo de dados do sistema: coleções, GridFS, índices e regras de negócio aplicadas
> na persistência. Base para qualquer trabalho futuro em banco.

---

## 1. Banco de dados

- Nome do banco: `viatura` (definido em `lib/mongodb.ts:31`).
- Conexão: `MONGODB_URI` via variável de ambiente (`lib/mongodb.ts:3`).

## 2. Coleção `handovers` — registros de carga/devolução

Estrutura do documento com fluxo de duas fases (carga + devolução):

```js
{
  _id: ObjectId,

  // --- STATUS ---
  status: "aberto" | "fechado",

  // --- DADOS DA VIATURA ---
  plate: "ABC1D23",                 // normalizado: maiúsculas, sem caracteres especiais

  // --- FASE 1: CARGA (SAÍDA) ---
  departureOfficer: {               // policial que fez a carga (matrícula do login)
    patente: "Sd",
    nome: "João da Silva",
    matricula: "123456"
  },
  deliveringOfficer: {              // quem entregou a viatura
    patente: "Sgt",
    nome: "Maria Souza"
  },
  garrisonCommander: {              // comandante da guarnição
    patente: "Ten",
    nome: "Carlos Lima"
  },
  serviceType: "ordinario",         // "ordinario" | "intensificacao_tatica" | "adm" | "outros"
  serviceTypeOther: "",             // preenchido quando serviceType = "outros"
  kilometers: {
    initial: 45210,                 // preenchido na CARGA
    final: null                     // preenchido na DEVOLUÇÃO (null na carga)
  },
  departureChecklist: {             // checklist na carga
    oleo_motor:             "ok" | "alteracao",
    arrefecimento:          "ok" | "alteracao",
    pneus:                  "ok" | "alteracao",
    partida_motor:          "ok" | "alteracao",
    freios:                 "ok" | "alteracao",
    identificacao_visual:   "ok" | "alteracao",
    limpeza:                "ok" | "alteracao",
    iluminacao:             "ok" | "alteracao",
    ad_blue:                "ok" | "alteracao",
    giroflex_sirene:        "ok" | "alteracao"
  },
  departureChecklistObs: {          // observações dos itens com alteração
    oleo_motor: "Nível do óleo abaixo do mínimo"
  },
  departureObservations: "Observações gerais...",
  departurePhotos: {                // 5 fotos na carga
    frente:          "ObjectIdGridFS",
    fundo:           "ObjectIdGridFS",
    lateral_esquerda:"ObjectIdGridFS",
    lateral_direita: "ObjectIdGridFS",
    painel:          "ObjectIdGridFS"
  },

  // --- FASE 2: DEVOLUÇÃO (ENTRADA) ---
  returnOfficer: {                  // quem recebeu na devolução
    patente: "Cb",
    nome: "Pedro Santos"
  },
  returnPhotos: { ... } | null,     // 5 fotos na devolução (null até devolver)
  returnObservations: "..." | null,
  returnedAt: ISODate(...) | null,  // data da devolução

  // --- METADADOS ---
  createdAt: ISODate(...),
  updatedAt: ISODate(...)
}
```

### Regras de negócio

1. **Um policial = uma viatura**: um policial não pode ter 2 registros abertos simultaneamente.
2. **Uma viatura = um registro aberto**: se a viatura X já tem registro aberto, ninguém pode fazer nova carga nela.
3. **Devolução só pelo dono**: apenas o policial que fez a carga pode registrar a devolução.
4. **Km final ≥ Km inicial**: validação no `returnSchema`.
5. **Fotos obrigatórias nas duas fases**: 5 fotos na carga, 5 fotos na devolução.
6. **Admin pode fechar registros**: o admin pode fechar registros em aberto (sem dados de devolução).
7. **Registro é imutável após fechamento** (sem edição).
8. **Exclusão remove fotos do GridFS e depois o documento**.

### Mudanças do modelo anterior

- `officer` → `departureOfficer` (renomeado)
- `deliveringOfficer` → mantido (sem matricula)
- `receivingOfficer` → `returnOfficer` (renomeado, preenchido na devolução)
- `checklist` → `departureChecklist` (renomeado)
- `checklistObservations` → `departureChecklistObs` (renomeado)
- `observations` → `departureObservations` (renomeado)
- `photos` → `departurePhotos` (renomeado)
- `status` → NOVO ("aberto" | "fechado")
- `returnPhotos` → NOVO
- `returnObservations` → NOVO
- `returnedAt` → NOVO
- `kilometers.final` → agora null até devolução

## 3. GridFS — bucket `photos`

Gerenciado pelo driver (`lib/gridfs.ts`). Gera as coleções:

- `photos.files` — metadados: `filename`, `length`, `chunkSize`, `uploadDate`, `metadata`.
- `photos.chunks` — blocos binários de 255KB.

### Conteúdo do `metadata`

```js
{ contentType: "image/jpeg" }   // gravado no upload (lib/gridfs.ts:12)
```

> O driver mongodb v7 não aceita `contentType` como opção top-level; por isso ele vai em `metadata`.

### Nomes dos arquivos

- Carga: `{PLACA}_{posicao}_departure.jpg` (ex.: `ABC1D23_frente_departure.jpg`)
- Devolução: `{PLACA}_{posicao}_return.jpg` (ex.: `ABC1D23_frente_return.jpg`)

### Tamanho estimado por registro

- Carga: 5 fotos × ~250KB ≈ 1,25MB
- Devolução: 5 fotos × ~250KB ≈ 1,25MB
- Total por registro completo: ~2,5MB

## 4. Índices recomendados

```js
db.handovers.createIndex({ createdAt: -1 })
db.handovers.createIndex({ plate: 1 })
db.handovers.createIndex({ 'departureOfficer.matricula': 1 })
db.handovers.createIndex({ status: 1 })
db.handovers.createIndex({ status: 1, 'departureOfficer.matricula': 1 })  // busca policial + aberto
db.handovers.createIndex({ status: 1, plate: 1 })                         // busca viatura + aberto
```

## 5. Coleção `users`

```js
{
  _id: ObjectId,
  matricula: "123456",          // única
  nome: "João da Silva",
  patente: "Sd",
  email: "email@exemplo.com",
  role: "admin" | "user",
  passwordHash: "<hash bcrypt>",   // bcryptjs, custo 12
  isActive: true,
  primeiroAcesso: true,
  resetRequested: false,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  passwordChangedAt: Date
}
```

## 6. Regras de negócio na persistência

1. Placa/prefixo obrigatório, normalizada em maiúsculas (sem caracteres especiais).
2. Kilometragem final **≥** inicial (refine do Zod — `lib/validation.ts`).
3. Todos os 10 itens do checklist devem ter status `ok` ou `alteracao`.
4. As 5 fotos são obrigatórias em cada fase; tamanho máximo por foto = `MAX_PHOTO_SIZE_MB`.
5. "Com Alteração" não exige observação obrigatória (pode ficar vazia).
6. Registro fica "aberto" até devolução ou fechamento pelo admin.
7. Exclusão remove primeiro as fotos do GridFS e depois o documento.
