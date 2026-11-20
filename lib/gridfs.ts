import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'stream'
import { connectToDatabase } from './mongodb'

function checkDeps(): void {
  if (typeof Buffer === 'undefined') {
    throw new Error('Buffer não está disponível no runtime atual. Verifique se serverActions.runtime está configurado como nodejs.')
  }
  if (typeof Readable === 'undefined') {
    throw new Error('stream.Readable não está disponível no runtime atual')
  }
}

export async function uploadPhoto(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  checkDeps()
  console.log(`[gridfs] Iniciando upload: ${filename} (${buffer.length} bytes, ${contentType})`)
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  const uploadStream = bucket.openUploadStream(filename, { metadata: { contentType } })
  const id = uploadStream.id

  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(uploadStream)
      .on('finish', () => {
        console.log(`[gridfs] Upload concluído: ${filename} (${id})`)
        resolve()
      })
      .on('error', (err) => {
        console.error(`[gridfs] Erro no upload de ${filename}:`, err)
        reject(err)
      })
  })

  return id.toString()
}

export async function getPhoto(id: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  checkDeps()
  if (!ObjectId.isValid(id)) return null
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  const chunks: Buffer[] = []

  return new Promise((resolve, reject) => {
    bucket
      .openDownloadStream(new ObjectId(id))
      .on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      .on('end', async () => {
        const file = await db.collection('photos.files').findOne({ _id: new ObjectId(id) })
        if (!file) return resolve(null)
        const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg'
        resolve({ buffer: Buffer.concat(chunks), contentType })
      })
      .on('error', reject)
  })
}

export interface PhotoMeta {
  id: string
  filename: string
  contentType: string
  length: number
  uploadDate: Date
}

export async function getPhotosMeta(ids: string[]): Promise<Map<string, PhotoMeta>> {
  const validIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  const result = new Map<string, PhotoMeta>()
  if (validIds.length === 0) return result
  const { db } = await connectToDatabase()
  const files = await db.collection('photos.files').find({ _id: { $in: validIds } }).toArray()
  for (const file of files) {
    const id = (file._id as ObjectId).toString()
    result.set(id, {
      id,
      filename: typeof file.filename === 'string' ? file.filename : '',
      contentType: file.metadata?.contentType || file.contentType || 'image/jpeg',
      length: typeof file.length === 'number' ? file.length : 0,
      uploadDate: file.uploadDate instanceof Date ? file.uploadDate : new Date(0),
    })
  }
  return result
}

export async function openPhotoStream(id: string): Promise<Readable | null> {
  checkDeps()
  if (!ObjectId.isValid(id)) return null
  const { db } = await connectToDatabase()
  const file = await db.collection('photos.files').findOne(
    { _id: new ObjectId(id) },
    { projection: { _id: 1 } }
  )
  if (!file) return null
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  return bucket.openDownloadStream(new ObjectId(id))
}

export async function deletePhotos(ids: string[]): Promise<{ deleted: number; bytes: number }> {
  checkDeps()
  const validIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  if (validIds.length === 0) return { deleted: 0, bytes: 0 }
  const { db } = await connectToDatabase()
  const files = await db
    .collection('photos.files')
    .find({ _id: { $in: validIds } }, { projection: { length: 1 } })
    .toArray()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  let deleted = 0
  let bytes = 0
  for (const file of files) {
    try {
      await bucket.delete(file._id as ObjectId)
      deleted += 1
      bytes += typeof file.length === 'number' ? file.length : 0
    } catch {
      continue
    }
  }
  return { deleted, bytes }
}

export async function deletePhoto(id: string): Promise<void> {
  checkDeps()
  if (!ObjectId.isValid(id)) return
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  try {
    await bucket.delete(new ObjectId(id))
  } catch {
    // arquivo inexistente — ignora
  }
}