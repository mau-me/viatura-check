import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não configurado no .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')

function idsOf(photos) {
  if (!photos || typeof photos !== 'object') return []
  return Object.values(photos).filter(
    (value) => typeof value === 'string' && ObjectId.isValid(value)
  )
}

async function backfill() {
  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    console.log('✅ Conectado ao MongoDB')
    if (DRY_RUN) console.log('ℹ️  Modo dry-run: nenhuma alteração será gravada')

    const db = client.db('viatura')
    const docs = await db
      .collection('handovers')
      .find({}, { projection: { departurePhotos: 1, returnPhotos: 1 } })
      .toArray()
    console.log(`📋 ${docs.length} registros analisados`)

    const perDoc = new Map()
    const allIds = []
    for (const doc of docs) {
      const departure = idsOf(doc.departurePhotos)
      const returned = idsOf(doc.returnPhotos)
      if (departure.length === 0 && returned.length === 0) continue
      perDoc.set(doc._id.toString(), { departure, returned })
      allIds.push(...departure, ...returned)
    }

    const files = await db
      .collection('photos.files')
      .find(
        { _id: { $in: allIds.map((id) => new ObjectId(id)) } },
        { projection: { length: 1 } }
      )
      .toArray()
    const sizes = new Map(
      files.map((file) => [file._id.toString(), typeof file.length === 'number' ? file.length : 0])
    )

    let updated = 0
    for (const [id, { departure, returned }] of perDoc) {
      const photoStats = {}
      for (const [phase, ids] of [
        ['departure', departure],
        ['return', returned],
      ]) {
        if (ids.length === 0) continue
        const existing = ids.filter((photoId) => sizes.has(photoId))
        photoStats[phase] = {
          count: existing.length,
          bytes: existing.reduce((sum, photoId) => sum + (sizes.get(photoId) || 0), 0),
        }
      }
      if (Object.keys(photoStats).length === 0) continue

      if (DRY_RUN) {
        console.log(`[dry-run] ${id}`, photoStats)
      } else {
        await db
          .collection('handovers')
          .updateOne({ _id: new ObjectId(id) }, { $set: { photoStats } })
      }
      updated += 1
    }

    console.log(`✅ ${updated} registros ${DRY_RUN ? 'seriam atualizados' : 'atualizados'}`)
  } finally {
    await client.close()
  }
}

backfill().catch((error) => {
  console.error('❌ Erro no backfill:', error)
  process.exit(1)
})
