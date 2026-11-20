import archiver from 'archiver'
import { Readable } from 'stream'
import { NextResponse } from 'next/server'
import { ObjectId, type Document } from 'mongodb'
import { requireRoot } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { getPhotosMeta, openPhotoStream } from '@/lib/gridfs'
import { MAX_EXPORT_RECORDS } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Phase = 'departure' | 'return'

const PHASE_FOLDERS: Record<Phase, string> = {
  departure: 'carga',
  return: 'devolucao',
}

function safeSegment(value: string): string {
  return (value || 'registro').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 40)
}

function dateSegment(value: unknown): string {
  const date = value instanceof Date ? value : new Date(value as string)
  if (isNaN(date.getTime())) return 'sem-data'
  return date.toISOString().slice(0, 10)
}

function folderFor(doc: Document): string {
  const label = safeSegment(
    (typeof doc.prefix === 'string' && doc.prefix) ||
      (typeof doc.plate === 'string' && doc.plate) ||
      'registro'
  )
  return `${label}_${dateSegment(doc.createdAt)}_${doc._id.toString().slice(-6)}`
}

function manifestFor(doc: Document) {
  return {
    id: doc._id.toString(),
    prefix: doc.prefix || '',
    plate: doc.plate || '',
    status: doc.status,
    departureOfficer: doc.departureOfficer,
    deliveringOfficer: doc.deliveringOfficer,
    garrisonCommander: doc.garrisonCommander,
    serviceType: doc.serviceType,
    serviceTypeOther: doc.serviceTypeOther,
    kilometers: doc.kilometers,
    departureChecklist: doc.departureChecklist,
    departureChecklistObs: doc.departureChecklistObs,
    departureObservations: doc.departureObservations,
    returnOfficer: doc.returnOfficer,
    returnObservations: doc.returnObservations,
    createdAt: doc.createdAt,
    returnedAt: doc.returnedAt,
  }
}

function extensionFor(filename: string, contentType: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot > 0) {
    const ext = filename.slice(dot).toLowerCase()
    if (/^\.[a-z0-9]{2,5}$/.test(ext)) return ext
  }
  if (contentType === 'image/png') return '.png'
  if (contentType === 'image/webp') return '.webp'
  return '.jpg'
}

export async function GET(request: Request) {
  try {
    const session = await requireRoot()
    const url = new URL(request.url)
    const ids = (url.searchParams.get('ids') || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => ObjectId.isValid(id))

    if (ids.length === 0) {
      return new NextResponse('Nenhum registro informado', { status: 400 })
    }
    if (ids.length > MAX_EXPORT_RECORDS) {
      return new NextResponse(`Selecione no máximo ${MAX_EXPORT_RECORDS} registros por download`, {
        status: 400,
      })
    }

    const { db } = await connectToDatabase()
    const docs = await db
      .collection('handovers')
      .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
      .toArray()

    if (docs.length === 0) {
      return new NextResponse('Registros não encontrados', { status: 404 })
    }

    const entries: { doc: Document; phase: Phase; key: string; photoId: string }[] = []
    for (const doc of docs) {
      const purged = doc.photosPurged && typeof doc.photosPurged === 'object' ? doc.photosPurged : {}
      for (const phase of ['departure', 'return'] as const) {
        if ((purged as Record<string, unknown>)[phase]) continue
        const photos = doc[`${phase}Photos`]
        if (!photos || typeof photos !== 'object') continue
        for (const [key, value] of Object.entries(photos as Record<string, unknown>)) {
          if (typeof value === 'string' && ObjectId.isValid(value)) {
            entries.push({ doc, phase, key, photoId: value })
          }
        }
      }
    }

    const meta = await getPhotosMeta(entries.map((entry) => entry.photoId))
    const available = entries.filter((entry) => meta.has(entry.photoId))
    if (available.length === 0) {
      return new NextResponse('Nenhuma foto disponível para exportação', { status: 404 })
    }

    const exportedIds = Array.from(
      new Set(available.map((entry) => entry.doc._id.toString()))
    )

    const archive = archiver('zip', { store: true })
    let failed = false
    archive.on('warning', (error) => {
      if (error.code !== 'ENOENT') console.error('Aviso ao gerar ZIP:', error)
    })
    archive.on('error', (error) => {
      failed = true
      console.error('Erro ao gerar ZIP:', error)
    })

    void (async () => {
      const manifests = new Set<string>()
      try {
        for (const entry of available) {
          const docId = entry.doc._id.toString()
          const folder = folderFor(entry.doc)
          if (!manifests.has(docId)) {
            manifests.add(docId)
            archive.append(JSON.stringify(manifestFor(entry.doc), null, 2), {
              name: `${folder}/registro.json`,
            })
          }

          const info = meta.get(entry.photoId)
          if (!info) continue
          const stream = await openPhotoStream(entry.photoId)
          if (!stream) continue
          const ext = extensionFor(info.filename, info.contentType)
          await new Promise<void>((resolve) => {
            stream.once('end', () => resolve())
            stream.once('close', () => resolve())
            stream.once('error', (error) => {
              failed = true
              console.error(`Erro ao ler foto ${entry.photoId}:`, error)
              resolve()
            })
            archive.append(stream, {
              name: `${folder}/${PHASE_FOLDERS[entry.phase]}/${safeSegment(entry.key)}${ext}`,
            })
          })
        }
        await archive.finalize()
        if (!failed) {
          await db.collection('handovers').updateMany(
            { _id: { $in: exportedIds.map((id) => new ObjectId(id)) } },
            { $set: { photosBackup: { at: new Date(), by: session.matricula } } }
          )
        }
      } catch (error) {
        failed = true
        console.error('Erro ao montar ZIP:', error)
        archive.abort()
      }
    })()

    const filename = `fotos-viaturas-${new Date().toISOString().slice(0, 10)}.zip`
    return new NextResponse(
      Readable.toWeb(archive as unknown as Readable) as unknown as ReadableStream,
      {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Erro ao exportar fotos:', error)
    return new NextResponse('Acesso negado ou erro ao exportar fotos', { status: 403 })
  }
}
