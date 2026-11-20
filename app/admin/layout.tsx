import { redirect } from 'next/navigation'
import { getSession } from '@/lib/jwt'
import { findUserById } from '@/lib/auth'
import { isStaff } from '@/lib/roles'
import { AdminLayoutClient } from '@/components/app/AdminLayoutClient'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const user = await findUserById(session.sub)

  if (!user || !user.isActive || !isStaff(user.role)) {
    redirect('/')
  }

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

  return <AdminLayoutClient user={userData}>{children}</AdminLayoutClient>
}
