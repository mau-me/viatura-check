import { requireAdmin } from '@/lib/jwt'
import { HandoverDetailClient } from '@/components/app/HandoverDetailClient'

export default async function HandoverDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin()
  const { id } = params
  return <HandoverDetailClient id={id} />
}
