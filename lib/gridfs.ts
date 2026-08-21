import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'stream'
import { connectToDatabase } from './mongodb'

export async function uploadPhoto(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  const uploadStream = bucket.openUploadStream(filename, { metadata: { contentType } })
  const id = uploadStream.id

  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(uploadStream)
      .on('finish', () => resolve())
      .on('error', reject)
  })

  return id.toString()
}

export async function getPhoto(id: string): Promise<{ buffer: Buffer; contentType: string } | null> {
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
  if (!ObjectId.isValid(id)) return
  const { db } = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  try {
    await bucket.delete(new ObjectId(id))
  } catch {
    // arquivo inexistente — ignora
  }
}