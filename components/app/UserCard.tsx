'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, KeyRound, Trash2 } from 'lucide-react'
import { ROLE_LABELS, isRoot } from '@/lib/roles'
import type { UserRow } from './UserTable'

interface UserCardProps {
  user: UserRow
  canManageRoot: boolean
  onEdit: (user: UserRow) => void
  onReset: (user: UserRow) => void
  onDelete: (user: UserRow) => void
}

export function UserCard({ user, canManageRoot, onEdit, onReset, onDelete }: UserCardProps) {
  const locked = isRoot(user.role) && !canManageRoot
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
        <Badge variant={user.role === 'user' ? 'secondary' : 'default'}>
          {ROLE_LABELS[user.role]}
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
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(user)} disabled={locked}>
          <Pencil className="size-4" /> Editar
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onReset(user)} disabled={locked}>
          <KeyRound className="size-4" /> Reset
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(user)}
          disabled={(user.role === 'admin' && !user.isActive) || locked}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
