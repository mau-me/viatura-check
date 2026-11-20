'use server'

import { revalidatePath } from 'next/cache'
import { ObjectId, type Db, type Document } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'
import { deletePhotos, getPhotosMeta } from '@/lib/gridfs'
import { requireRoot } from '@/lib/auth'
import { escapeRegExp } from '@/lib/utils'
import {
  MAX_PURGE_RECORDS,
  ORPHAN_MIN_AGE_MS,
  PHOTO_BACKUP_TTL_HOURS,
  PHOTO_BACKUP_TTL_MS,
  STORAGE_LIMIT_BYTES,
  STORAGE_LIMIT_MB,
} from '@/lib/storage'

type Phase = 'departure' | 'return'

function photoIdsFrom(doc: Document, phase: Phase): string[] {
  const photos = doc[`${phase}Photos`]
  if (!photos || typeof photos !== 'object') return []
  return Object.values(photos as Record<string, unknown>).filter(
    (value): value is string => typeof value === 'string' && ObjectId.isValid(value)
  )
}

function phasePurged(doc: Document, phase: Phase): boolean {
  const purged = doc.photosPurged
  if (!purged || typeof purged !== 'object') return false
  return !!(purged as Record<string, unknown>)[phase]
}

function backupAt(doc: Document): Date | null {
  const backup = doc.photosBackup
  if (!backup || typeof backup !== 'object') return null
  const raw = (backup as Record<string, unknown>).at
  if (!raw) return null
  const date = new Date(raw as string | Date)
  return isNaN(date.getTime()) ? null : date
}

async function collectReferencedIds(db: Db): Promise<Set<string>> {
  const referenced = new Set<string>()
  const docs = await db
    .collection('handovers')
    .find({}, { projection: { departurePhotos: 1, returnPhotos: 1 } })
    .toArray()
  for (const doc of docs) {
    for (const id of [...photoIdsFrom(doc, 'departure'), ...photoIdsFrom(doc, 'return')]) {
      referenced.add(id)
    }
  }
  return referenced
}

export async function getStorageStatsAction() {
  try {
    await requireRoot()
    const { db } = await connectToDatabase()

    const dbStats = await db.command({ dbStats: 1, scale: 1 })
    const photosAgg = await db
      .collection('photos.files')
      .aggregate([{ $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$length' } } }])
      .toArray()
    const photos = photosAgg[0] || { count: 0, bytes: 0 }
    const photoCount = Number(photos.count || 0)
    const photoBytes = Number(photos.bytes || 0)

    const [total, open, closed, purged, withPhotos] = await Promise.all([
      db.collection('handovers').countDocuments({}),
      db.collection('handovers').countDocuments({ status: 'aberto' }),
      db.collection('handovers').countDocuments({ status: 'fechado' }),
      db.collection('handovers').countDocuments({
        $or: [
          { 'photosPurged.departure': { $exists: true } },
          { 'photosPurged.return': { $exists: true } },
        ],
      }),
      db.collection('handovers').countDocuments({ departurePhotos: { $exists: true, $ne: null } }),
    ])

    const dataSize = Number(dbStats.dataSize || 0)
    const indexSize = Number(dbStats.indexSize || 0)
    const storageSize = Number(dbStats.storageSize || 0)
    const usedBytes = dataSize + indexSize
    const diskUsedBytes = storageSize + indexSize
    const freeBytes = Math.max(0, STORAGE_LIMIT_BYTES - usedBytes)
    const percent =
      STORAGE_LIMIT_BYTES > 0 ? Math.min(100, (usedBytes / STORAGE_LIMIT_BYTES) * 100) : 0
    const avgPhotoBytesPerRecord = withPhotos > 0 ? photoBytes / withPhotos : 0
    const estimatedRecordsRemaining =
      avgPhotoBytesPerRecord > 0 ? Math.floor(freeBytes / avgPhotoBytesPerRecord) : null

    return {
      success: true,
      stats: {
        limitMb: STORAGE_LIMIT_MB,
        limitBytes: STORAGE_LIMIT_BYTES,
        usedBytes,
        freeBytes,
        percent,
        dataSize,
        indexSize,
        storageSize,
        diskUsedBytes,
        objects: Number(dbStats.objects || 0),
        photos: { count: photoCount, bytes: photoBytes },
        records: { total, open, closed, purged, withPhotos },
        avgPhotoBytesPerRecord,
        estimatedRecordsRemaining,
        backupTtlHours: PHOTO_BACKUP_TTL_HOURS,
      },
    }
  } catch (error) {
    console.error('Erro ao consultar armazenamento:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao consultar armazenamento' }
  }
}

export async function getPhotoCleanupCandidatesAction(query = '') {
  try {
    await requireRoot()
    const { db } = await connectToDatabase()

    const filters: Record<string, unknown>[] = [{ status: 'fechado' }]
    if (query) {
      const term = escapeRegExp(query)
      filters.push({
        $or: [
          { prefix: { $regex: term, $options: 'i' } },
          { plate: { $regex: term, $options: 'i' } },
          { 'departureOfficer.nome': { $regex: term, $options: 'i' } },
        ],
      })
    }

    const docs = await db
      .collection('handovers')
      .find({ $and: filters })
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray()

    const phaseIds = new Map<string, { departure: string[]; return: string[] }>()
    const allIds: string[] = []
    for (const doc of docs) {
      const departure = phasePurged(doc, 'departure') ? [] : photoIdsFrom(doc, 'departure')
      const returned = phasePurged(doc, 'return') ? [] : photoIdsFrom(doc, 'return')
      if (departure.length === 0 && returned.length === 0) continue
      phaseIds.set(doc._id.toString(), { departure, return: returned })
      allIds.push(...departure, ...returned)
    }

    const meta = await getPhotosMeta(allIds)
    const records = []
    for (const doc of docs) {
      const id = doc._id.toString()
      const ids = phaseIds.get(id)
      if (!ids) continue

      let photoCount = 0
      let photoBytes = 0
      for (const photoId of [...ids.departure, ...ids.return]) {
        const info = meta.get(photoId)
        if (info) {
          photoCount += 1
          photoBytes += info.length
        }
      }
      if (photoCount === 0) continue

      const backup = backupAt(doc)
      records.push({
        _id: id,
        prefix: typeof doc.prefix === 'string' ? doc.prefix : '',
        plate: typeof doc.plate === 'string' ? doc.plate : '',
        officer: doc.departureOfficer?.nome || '',
        createdAt: doc.createdAt,
        returnedAt: doc.returnedAt || null,
        photoCount,
        photoBytes,
        phases: [
          ...(ids.departure.length > 0 ? (['departure'] as Phase[]) : []),
          ...(ids.return.length > 0 ? (['return'] as Phase[]) : []),
        ],
        hasBackup: !!backup && Date.now() - backup.getTime() <= PHOTO_BACKUP_TTL_MS,
        backupAt: backup,
        purgedDeparture: phasePurged(doc, 'departure'),
        purgedReturn: phasePurged(doc, 'return'),
      })
    }

    return { success: true, records }
  } catch (error) {
    console.error('Erro ao listar fotos para limpeza:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao listar fotos para limpeza' }
  }
}

export async function purgeHandoverPhotosAction(ids: string[]) {
  try {
    const session = await requireRoot()
    const unique = Array.from(new Set(ids)).filter((id) => ObjectId.isValid(id))
    if (unique.length === 0) return { error: 'Nenhum registro selecionado' }
    if (unique.length > MAX_PURGE_RECORDS) {
      return { error: `Selecione no máximo ${MAX_PURGE_RECORDS} registros por limpeza` }
    }

    const { db } = await connectToDatabase()
    const docs = await db
      .collection('handovers')
      .find({ _id: { $in: unique.map((id) => new ObjectId(id)) } })
      .toArray()
    if (docs.length !== unique.length) {
      return { error: 'Um ou mais registros não foram encontrados' }
    }

    for (const doc of docs) {
      if (doc.status !== 'fechado') {
        return { error: 'Apenas registros fechados podem ter as fotos removidas' }
      }
      const backup = backupAt(doc)
      if (!backup || Date.now() - backup.getTime() > PHOTO_BACKUP_TTL_MS) {
        return {
          error: `Baixe as fotos antes de remover (backup válido por ${PHOTO_BACKUP_TTL_HOURS}h)`,
        }
      }
    }

    const plan = docs
      .map((doc) => ({
        doc,
        id: doc._id.toString(),
        departure: phasePurged(doc, 'departure') ? [] : photoIdsFrom(doc, 'departure'),
        return: phasePurged(doc, 'return') ? [] : photoIdsFrom(doc, 'return'),
      }))
      .filter((item) => item.departure.length > 0 || item.return.length > 0)

    if (plan.length === 0) return { error: 'Nenhuma foto disponível para remoção' }

    const allIds = plan.flatMap((item) => [...item.departure, ...item.return])
    const meta = await getPhotosMeta(allIds)
    const result = await deletePhotos(allIds)

    const now = new Date()
    let updated = 0
    for (const item of plan) {
      const set: Record<string, unknown> = { updatedAt: now }
      let hasPhase = false

      for (const phase of ['departure', 'return'] as const) {
        const phaseIds = item[phase]
        if (phaseIds.length === 0) continue

        let count = 0
        let bytes = 0
        for (const photoId of phaseIds) {
          const info = meta.get(photoId)
          if (info) {
            count += 1
            bytes += info.length
          }
        }
        set[`photosPurged.${phase}`] = { at: now, by: session.matricula, count, bytes }
        hasPhase = true
      }

      if (!hasPhase) continue
      await db.collection('handovers').updateOne({ _id: item.doc._id }, { $set: set })
      updated += 1
    }

    await db.collection('photo_cleanup_logs').insertOne({
      at: now,
      by: session.matricula,
      action: 'purge',
      recordIds: plan.map((item) => item.id),
      photoCount: result.deleted,
      bytes: result.bytes,
    })

    revalidatePath('/admin')
    return { success: true, records: updated, photos: result.deleted, bytes: result.bytes }
  } catch (error) {
    console.error('Erro ao remover fotos:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao remover fotos' }
  }
}

export async function getOrphanPhotosAction() {
  try {
    await requireRoot()
    const { db } = await connectToDatabase()

    const handoverCount = await db.collection('handovers').countDocuments({})
    const referenced = await collectReferencedIds(db)
    const cutoff = new Date(Date.now() - ORPHAN_MIN_AGE_MS)
    const files = await db
      .collection('photos.files')
      .find(
        { uploadDate: { $lt: cutoff } },
        { projection: { filename: 1, length: 1, uploadDate: 1 } }
      )
      .toArray()

    const orphans = files.filter((file) => !referenced.has(file._id.toString()))
    const items = orphans.slice(0, 200).map((file) => ({
      id: file._id.toString(),
      filename: typeof file.filename === 'string' ? file.filename : '',
      bytes: typeof file.length === 'number' ? file.length : 0,
      uploadDate: file.uploadDate,
    }))
    const bytes = orphans.reduce(
      (sum, file) => sum + (typeof file.length === 'number' ? file.length : 0),
      0
    )

    return {
      success: true,
      orphans: { count: orphans.length, bytes, items },
      safe: handoverCount > 0,
    }
  } catch (error) {
    console.error('Erro ao listar fotos órfãs:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao listar fotos órfãs' }
  }
}

export async function purgeOrphanPhotosAction() {
  try {
    const session = await requireRoot()
    const { db } = await connectToDatabase()

    const handoverCount = await db.collection('handovers').countDocuments({})
    if (handoverCount === 0) {
      return { error: 'Nenhum registro encontrado. Limpeza de órfãos bloqueada por segurança.' }
    }

    const referenced = await collectReferencedIds(db)
    const cutoff = new Date(Date.now() - ORPHAN_MIN_AGE_MS)
    const files = await db
      .collection('photos.files')
      .find({ uploadDate: { $lt: cutoff } }, { projection: { length: 1 } })
      .toArray()
    const orphanIds = files
      .filter((file) => !referenced.has(file._id.toString()))
      .map((file) => file._id.toString())

    if (orphanIds.length === 0) {
      return { success: true, photos: 0, bytes: 0 }
    }

    const result = await deletePhotos(orphanIds)
    await db.collection('photo_cleanup_logs').insertOne({
      at: new Date(),
      by: session.matricula,
      action: 'orphans',
      recordIds: [],
      photoCount: result.deleted,
      bytes: result.bytes,
    })

    revalidatePath('/admin')
    return { success: true, photos: result.deleted, bytes: result.bytes }
  } catch (error) {
    console.error('Erro ao limpar fotos órfãs:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao limpar fotos órfãs' }
  }
}
