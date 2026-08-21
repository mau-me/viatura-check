'use client'

import { ReactNode, useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { Header } from './Header'

interface AdminLayoutClientProps {
  user: {
    id: string
    matricula: string
    nome: string
    patente: string
    email?: string
    role: 'admin' | 'user'
    isActive: boolean
    primeiroAcesso: boolean
    resetRequested?: boolean
    createdAt: string
    lastLoginAt?: string
  }
  children: ReactNode
}

function AdminLayoutContent({ user, children }: AdminLayoutClientProps) {
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 bg-muted rounded-lg mx-auto mb-4" />
          <div className="h-4 w-48 bg-muted rounded-lg mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        isMobileSidebarOpen={false}
        onToggleMobileSidebar={() => {}}
      />
      <main className="pt-16 min-h-[calc(100vh-4rem)]">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}

export function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  return (
    <AuthProvider initialUser={user}>
      <AdminLayoutContent user={user}>{children}</AdminLayoutContent>
    </AuthProvider>
  )
}
