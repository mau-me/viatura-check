import { MongoClient } from 'mongodb'
import 'dotenv/config'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não configurado no .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')

function normalizePlate(raw) {
  const cleaned = (raw || '').replace(/[^A-Za-z0-9.]/g, '').toUpperCase()
  if (/^\d{5}$/.test(cleaned)) {
    return cleaned.slice(0, 1) + '.' + cleaned.slice(1)
  }
  return cleaned
}

async function backfill() {
  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    console.log('✅ Conectado ao MongoDB')
    if (DRY_RUN) console.log('ℹ️  Modo dry-run: nenhuma alteração será gravada')

    const db = client.db('viatura')
    const vehicles = await db.collection('vehicles').find({}, { projection: { prefix: 1, plate: 1 } }).toArray()
    console.log(`🚗 ${vehicles.length} viaturas carregadas`)

    const byPrefix = new Map()
    const byPlate = new Map()
    const ambiguous = new Set()
    for (const v of vehicles) {
      if (!v.prefix) continue
      const ref = { prefix: v.prefix, plate: v.plate || '' }
      const kp = normalizePlate(v.prefix)
      if (kp) {
        if (byPrefix.has(kp) && byPrefix.get(kp).prefix !== ref.prefix) {
          ambiguous.add('prefix:' + kp)
          byPrefix.delete(kp)
        } else {
          byPrefix.set(kp, ref)
        }
      }
      if (v.plate) {
        const kl = normalizePlate(v.plate)
        if (kl) {
          if (byPlate.has(kl) && byPlate.get(kl).prefix !== ref.prefix) {
            ambiguous.add('plate:' + kl)
            byPlate.delete(kl)
          } else {
            byPlate.set(kl, ref)
          }
        }
      }
    }
    if (ambiguous.size) console.log(`⚠️  Chaves ambíguas ignoradas: ${[...ambiguous].join(', ')}`)

    const handovers = await db.collection('handovers').find({}).toArray()
    console.log(`📋 ${handovers.length} registros (handovers) analisados`)

    let resolved = 0
    let updated = 0
    let skipped = 0
    let orphans = 0
    const now = new Date()

    for (const doc of handovers) {
      const explicitPrefix = typeof doc.prefix === 'string' ? doc.prefix.trim() : ''
      const explicitPlate = typeof doc.plate === 'string' ? doc.plate.trim() : ''
      const alreadyOk =
        explicitPrefix && explicitPlate && normalizePlate(explicitPrefix) !== normalizePlate(explicitPlate)
      if (alreadyOk) {
        skipped++
        continue
      }
      const keys = [normalizePlate(explicitPrefix), normalizePlate(explicitPlate)].filter(Boolean)
      let vehicle = null
      for (const key of keys) {
        vehicle = byPrefix.get(key) || byPlate.get(key)
        if (vehicle) break
      }
      if (!vehicle) {
        orphans++
        console.log(`⚠️  Órfão: ${doc._id} plate="${explicitPlate}" prefix="${explicitPrefix}"`)
        continue
      }
      resolved++
      const needsUpdate = doc.prefix !== vehicle.prefix || doc.plate !== vehicle.plate
      if (!needsUpdate) {
        skipped++
        continue
      }
      if (DRY_RUN) {
        console.log(`🔎 [dry-run] ${doc._id}: plate="${explicitPlate}" prefix="${explicitPrefix}" → prefix="${vehicle.prefix}" plate="${vehicle.plate}"`)
      } else {
        await db.collection('handovers').updateOne(
          { _id: doc._id },
          { $set: { prefix: vehicle.prefix, plate: vehicle.plate, updatedAt: now } }
        )
        updated++
      }
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Resolvidos: ${resolved}`)
    console.log(`✏️  Atualizados: ${updated}`)
    console.log(`⏭️  Já ok / sem alteração: ${skipped}`)
    console.log(`⚠️  Órfãos (sem viatura): ${orphans}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } catch (error) {
    console.error('❌ Erro no backfill:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

backfill()
