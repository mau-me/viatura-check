'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ClipboardList,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthUser } from './AuthContext'

interface SidebarProps {
  user: AuthUser
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Nova Carga', href: '/carga', icon: ClipboardList },
    ...(user.role === 'admin' ? [{ name: 'Administração', href: '/admin', icon: Shield }] : []),
  ]

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
          'fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform duration-200 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navegação principal"
      >
        <nav className="flex h-full flex-col px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
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
        </nav>
      </aside>
    </>
  )
}
