'use client'

import { Menu, User, Shield, Sun, Moon, LogOut, LayoutDashboard } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
  }

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

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

          <div className="hidden lg:flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Viatura</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Alternar tema"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" />
            }>
              <Avatar>
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.nome)}`} alt={user.nome} />
                <AvatarFallback>{getInitials(user.nome)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.nome}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.patente} • {user.matricula}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  router.push(user.role === 'admin' ? '/admin' : '/')
                }}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {user.role === 'admin' ? 'Administração' : 'Formulário'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="hidden sm:inline-flex">
            {user.role === 'admin' ? (
              <>
                <Shield className="mr-1 h-3 w-3" /> Admin
              </>
            ) : (
              <>
                <User className="mr-1 h-3 w-3" /> Usuário
              </>
            )}
          </Badge>
        </div>
      </div>
    </header>
  )
}