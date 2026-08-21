'use client'

import { useState, useEffect, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createUserAction, updateUserAction } from '@/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useMediaQuery } from '@/hooks/use-media-query'

export interface UserFormData {
  _id?: string
  matricula: string
  nome: string
  patente: string
  email?: string
  role: 'admin' | 'user'
  isActive: boolean
}

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserFormData | null
  onSuccess: () => void
}

export function UserForm({ open, onOpenChange, user, onSuccess }: UserFormProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [pending, startTransition] = useTransition()
  const isEdit = !!user

  const [form, setForm] = useState({
    matricula: '',
    nome: '',
    patente: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    isActive: true,
  })

  useEffect(() => {
    if (user) {
      setForm({
        matricula: user.matricula,
        nome: user.nome,
        patente: user.patente,
        email: user.email || '',
        role: user.role,
        isActive: user.isActive,
      })
    } else {
      setForm({ matricula: '', nome: '', patente: '', email: '', role: 'user', isActive: true })
    }
  }, [user, open])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData()
    if (isEdit && user?._id) formData.append('id', user._id)
    formData.append('matricula', form.matricula)
    formData.append('nome', form.nome)
    formData.append('patente', form.patente)
    formData.append('email', form.email)
    formData.append('role', form.role)
    if (form.isActive) formData.append('isActive', 'on')

    startTransition(async () => {
      const res = isEdit
        ? await updateUserAction(formData)
        : await createUserAction(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(isEdit ? 'Usuário atualizado!' : 'Usuário criado!')
        onOpenChange(false)
        onSuccess()
      }
    })
  }

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="matricula">Matrícula</Label>
        <Input
          id="matricula"
          value={form.matricula}
          onChange={(e) => setForm({ ...form, matricula: e.target.value })}
          placeholder="Ex: 123456"
          required
          disabled={isEdit}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Nome completo"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="patente">Patente</Label>
        <Input
          id="patente"
          value={form.patente}
          onChange={(e) => setForm({ ...form, patente: e.target.value })}
          placeholder="Ex: Sd, Sgt, Maj"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (opcional)</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="email@exemplo.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Função</Label>
        <Select
          value={form.role}
          onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'user' })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="isActive">Ativo</Label>
        <Switch
          id="isActive"
          checked={form.isActive}
          onCheckedChange={(c) => setForm({ ...form, isActive: c })}
        />
      </div>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Atualize os dados do usuário.' : 'Preencha os dados para criar um usuário.'}
            </DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DrawerTitle>
          <DrawerDescription>
            {isEdit ? 'Atualize os dados do usuário.' : 'Preencha os dados para criar um usuário.'}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4">{content}</div>
        <DrawerFooter>
          <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}