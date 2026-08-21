'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, KeyRound, Trash2 } from 'lucide-react'

export interface UserRow {
  _id: string
  matricula: string
  nome: string
  patente: string
  email?: string
  role: 'admin' | 'user'
  isActive: boolean
  primeiroAcesso: boolean
  resetRequested: boolean
}

interface UserTableProps {
  users: UserRow[]
  onEdit: (user: UserRow) => void
  onReset: (user: UserRow) => void
  onDelete: (user: UserRow) => void
}

export function UserTable({ users, onEdit, onReset, onDelete }: UserTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matrícula</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Patente</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell className="font-medium">{user.matricula}</TableCell>
              <TableCell>{user.nome}</TableCell>
              <TableCell>{user.patente}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Admin' : 'Usuário'}
                </Badge>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(user)} aria-label="Editar">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onReset(user)} aria-label="Redefinir senha">
                    <KeyRound className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user)}
                    aria-label="Excluir"
                    disabled={user.role === 'admin' && !user.isActive}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
