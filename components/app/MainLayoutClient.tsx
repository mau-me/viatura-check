'use client'

import { ReactNode, useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

interface MainLayoutClientProps {
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

function MainLayoutContent({ user, children }: MainLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
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
    <div className="min-h-screen bg-background/60">
      <Header
        user={user}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={setIsMobileSidebarOpen}
      />
      <Sidebar
        user={user}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="lg:pl-64">
        <main className="pt-16 min-h-[calc(100vh-4rem)] pb-20 lg:pb-0">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

export function MainLayoutClient({ user, children }: MainLayoutClientProps) {
  return (
    <AuthProvider initialUser={user}>
      <MainLayoutContent user={user}>{children}</MainLayoutContent>
    </AuthProvider>
  )
}