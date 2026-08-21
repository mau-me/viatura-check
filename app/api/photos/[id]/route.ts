import { NextResponse } from 'next/server'
import { getPhoto } from '@/lib/gridfs'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const photo = await getPhoto(params.id)
  if (!photo) {
    return new NextResponse('Foto não encontrada', { status: 404 })
  }
  return new NextResponse(new Uint8Array(photo.buffer), {
    headers: {
      'Content-Type': photo.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}