import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 'dotenv/config'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não configurado no .env.local')
  process.exit(1)
}

const CSV_PATH = resolve(process.cwd(), 'listaUsuarios.csv')

function cleanMatricula(raw) {
  const cleaned = raw.replace(/[^0-9]/g, '')
  return cleaned.length === 9 ? cleaned.slice(0, 8) : cleaned
}

async function seedUsers() {
  const client = new MongoClient(MONGODB_URI)

  try {
    const csv = readFileSync(CSV_PATH, 'utf-8')
    const lines = csv.trim().split('\n')

    const header = lines[0].split(';')
    const patenteIdx = header.indexOf('Patente')
    const nomeIdx = header.indexOf('Nome')
    const matriculaIdx = header.indexOf('Matricula')
    const emailIdx = header.indexOf('Email')

    if (patenteIdx === -1 || nomeIdx === -1 || matriculaIdx === -1) {
      console.error('❌ CSV deve conter as colunas: Patente, Nome, Matricula')
      process.exit(1)
    }

    const rows = lines.slice(1).filter((l) => l.trim())

    console.log(`📄 ${rows.length} registros encontrados no CSV`)

    await client.connect()
    console.log('✅ Conectado ao MongoDB')

    const db = client.db('viatura')
    const users = db.collection('users')

    await users.createIndex({ matricula: 1 }, { unique: true })
    console.log('✅ Índice único em "matricula" garantido')

    const existingDocs = await users.find({}, { projection: { matricula: 1 } }).toArray()
    const existingSet = new Set(existingDocs.map((d) => d.matricula))

    let created = 0
    let skipped = 0
    let errors = 0

    const now = new Date()

    for (const line of rows) {
      const cols = line.split(';')
      const patente = (cols[patenteIdx] || '').trim().toUpperCase()
      const nome = (cols[nomeIdx] || '').trim()
      const matricula = cleanMatricula(cols[matriculaIdx] || '')
      const email = (cols[emailIdx] || '').trim().toLowerCase()

      if (!patente || !nome || !matricula) {
        console.error(`❌ Dados inválidos: ${line}`)
        errors++
        continue
      }

      if (existingSet.has(matricula)) {
        console.log(`⏭️  Matrícula ${matricula} (${nome}) já existe, pulando`)
        skipped++
        continue
      }

      await users.insertOne({
        matricula,
        nome,
        patente,
        email: email || undefined,
        role: 'user',
        passwordHash: null,
        isActive: true,
        primeiroAcesso: true,
        resetRequested: false,
        createdAt: now,
        updatedAt: now,
      })

      existingSet.add(matricula)
      created++
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Criados: ${created}`)
    console.log(`⏭️  Pulados (já existentes): ${skipped}`)
    console.log(`❌ Erros: ${errors}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } catch (error) {
    console.error('❌ Erro ao importar usuários:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seedUsers()
