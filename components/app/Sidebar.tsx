'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthUser } from './AuthContext'

interface SidebarProps {
  user: AuthUser
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  { name: 'Formulário', href: '/', icon: LayoutDashboard },
]

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden',
          isOpen ? 'block' : 'hidden'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navegação principal"
      >
        <nav className="flex h-full flex-col px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.name}
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 text-sm font-medium',
                  isActive && 'bg-primary text-primary-foreground shadow-sm'
                )}
                onClick={() => {
                  router.push(item.href)
                  onClose()
                }}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Button>
            )
          })}

          <div className="flex-1" />

          <div className="pt-4 border-t">
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Conta
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 py-2 text-sm"
                  onClick={onClose}
                />
              }>
                <Settings className="h-5 w-5 shrink-0" />
                Configurações
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.nome}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.patente} • {user.matricula}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await fetch('/api/auth/logout', { method: 'POST' })
                    if (res.ok) window.location.href = '/login'
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </aside>
    </>
  )
}