'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard } from 'lucide-react'

const navigation = [
  { name: 'Formulário', href: '/', icon: LayoutDashboard },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="grid grid-cols-1 h-14">
        {navigation.map((item) => {
          const isActive = pathname === item.href

          return (
            <button
              key={item.name}
              onClick={() => window.location.href = item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-2 py-1.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}