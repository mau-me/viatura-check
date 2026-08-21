import { MongoClient } from 'mongodb'
import 'dotenv/config'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não configurado no .env.local')
  process.exit(1)
}

const ADMIN_MATRICULA = process.env.SEED_ADMIN_MATRICULA || 'ADMIN001'
const ADMIN_NOME = process.env.SEED_ADMIN_NOME || 'Administrador do Sistema'
const ADMIN_PATENTE = process.env.SEED_ADMIN_PATENTE || 'Maj'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@viatura.local'

async function seedAdmin() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado ao MongoDB')

    const db = client.db('viatura')
    const users = db.collection('users')

    await users.createIndex({ matricula: 1 }, { unique: true })
    console.log('✅ Índice único em "matricula" garantido')

    const existing = await users.findOne({ matricula: ADMIN_MATRICULA })

    if (existing) {
      console.log(`ℹ️  Admin com matrícula "${ADMIN_MATRICULA}" já existe`)
      console.log('   Para recriar, delete o usuário primeiro ou use outra matrícula')
      return
    }

    const now = new Date()
    await users.insertOne({
      matricula: ADMIN_MATRICULA,
      nome: ADMIN_NOME,
      patente: ADMIN_PATENTE,
      email: ADMIN_EMAIL.toLowerCase(),
      role: 'admin',
      passwordHash: null,
      isActive: true,
      primeiroAcesso: true,
      resetRequested: false,
      createdAt: now,
      updatedAt: now,
    })

    console.log('✅ Admin criado com sucesso!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Matrícula: ${ADMIN_MATRICULA}`)
    console.log(`   Nome:      ${ADMIN_NOME}`)
    console.log(`   Patente:   ${ADMIN_PATENTE}`)
    console.log(`   Email:     ${ADMIN_EMAIL}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('🔐 Acesse /login e use a matrícula acima')
    console.log('   O sistema solicitará a criação de nova senha')
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seedAdmin()