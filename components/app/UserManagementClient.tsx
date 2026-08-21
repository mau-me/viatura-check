'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTransition } from 'react'
import { Plus, Search, Loader2, Users2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  listUsersAction,
  deleteUserAction,
  adminClearUserPasswordAction,
} from '@/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserTable, type UserRow } from './UserTable'
import { UserCard } from './UserCard'
import { UserForm } from './UserForm'
import { useMediaQuery } from '@/hooks/use-media-query'

interface UserManagementClientProps {
  initialUsers: UserRow[]
}

export function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [pending, startTransition] = useTransition()

  const refresh = useCallback(async (search = query) => {
    const res = await listUsersAction(search)
    if ('users' in res && res.users) {
      setUsers(res.users as UserRow[])
    }
  }, [query])

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => refresh(query))
    }, 300)
    return () => clearTimeout(t)
  }, [query, refresh])

  const handleEdit = (user: UserRow) => {
    setEditingUser(user)
    setFormOpen(true)
  }

  const handleReset = (user: UserRow) => {
    const formData = new FormData()
    formData.append('id', user._id)
    startTransition(async () => {
      const res = await adminClearUserPasswordAction(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message || 'Senha redefinida!')
        await refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!deletingUser) return
    const formData = new FormData()
    formData.append('id', deletingUser._id)
    startTransition(async () => {
      const res = await deleteUserAction(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Usuário excluído!')
        setDeletingUser(null)
        await refresh()
      }
    })
  }

  const handleFormSuccess = () => {
    setEditingUser(null)
    startTransition(() => refresh())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por matrícula, nome, patente ou email..."
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingUser(null); setFormOpen(true) }} className="shrink-0">
          <Plus className="size-4" /> Novo Usuário
        </Button>
      </div>

      {pending && users.length === 0 ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <Users2 className="size-8" />
          <p>Nenhum usuário encontrado.</p>
        </div>
      ) : isDesktop ? (
        <UserTable
          users={users}
          onEdit={handleEdit}
          onReset={handleReset}
          onDelete={(u) => setDeletingUser(u)}
        />
      ) : (
        <div className="grid gap-3">
          {users.map((u) => (
            <UserCard
              key={u._id}
              user={u}
              onEdit={handleEdit}
              onReset={handleReset}
              onDelete={(user) => setDeletingUser(user)}
            />
          ))}
        </div>
      )}

      <UserForm
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário{' '}
              <span className="font-medium text-foreground">{deletingUser?.nome}</span>? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending} className="bg-destructive text-white hover:bg-destructive/90">
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
