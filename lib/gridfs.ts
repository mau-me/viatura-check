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