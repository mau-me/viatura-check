'use client'

import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from './AuthContext'

interface HeaderProps {
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
  isMobileSidebarOpen: boolean
  onToggleMobileSidebar: (open: boolean) => void
}

export function Header({
  user,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}: HeaderProps) {
  const { logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
  }

  const firstName = user.nome.split(' ')[0]

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      'lg:pl-64'
    )}>
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => onToggleMobileSidebar(!isMobileSidebarOpen)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <a href="/" className="hidden lg:flex items-center gap-2">
            <img
              src="/brasao_cipe_polo_sem_fundo.png"
              alt="Viatura"
              className="h-10 w-10 object-contain"
            />
            <span className="font-bold text-xl">Viatura</span>
          </a>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm font-medium mr-2">Olá, {firstName}</span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Alternar tema"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Sair do sistema"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
