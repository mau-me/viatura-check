import { redirect } from 'next/navigation'
import { getSession } from '@/lib/jwt'
import { findUserById } from '@/lib/auth'
import { MainLayoutClient } from '@/components/app/MainLayoutClient'
import { UserDashboardClient } from '@/components/app/UserDashboardClient'

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await findUserById(session.sub)
  if (!user || !user.isActive) redirect('/login')

  const userData = {
    id: user._id.toString(),
    matricula: user.matricula,
    nome: user.nome,
    patente: user.patente,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    primeiroAcesso: user.primeiroAcesso,
    resetRequested: user.resetRequested,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
  }

  return (
    <MainLayoutClient user={userData}>
      <UserDashboardClient />
    </MainLayoutClient>
  )
}
