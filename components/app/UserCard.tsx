'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, KeyRound, Trash2 } from 'lucide-react'
import type { UserRow } from './UserTable'

interface UserCardProps {
  user: UserRow
  onEdit: (user: UserRow) => void
  onReset: (user: UserRow) => void
  onDelete: (user: UserRow) => void
}

export function UserCard({ user, onEdit, onReset, onDelete }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium leading-tight">{user.nome}</p>
          <p className="text-sm text-muted-foreground">
            {user.patente} &middot; {user.matricula}
          </p>
          {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
        </div>
        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
          {user.role === 'admin' ? 'Admin' : 'Usuário'}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge variant={user.isActive ? 'outline' : 'destructive'}>
          {user.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
        {user.primeiroAcesso && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            1º acesso
          </Badge>
        )}
        {user.resetRequested && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Reset
          </Badge>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(user)}>
          <Pencil className="size-4" /> Editar
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onReset(user)}>
          <KeyRound className="size-4" /> Reset
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(user)}
          disabled={user.role === 'admin' && !user.isActive}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
