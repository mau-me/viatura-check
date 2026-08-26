'use client'

import { useState, useEffect, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createVehicleAction, updateVehicleAction } from '@/actions/vehicle-actions'
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
import { useMediaQuery } from '@/hooks/use-media-query'

export interface VehicleFormData {
  _id?: string
  prefix: string
  plate?: string
  model?: string
  year?: number
}

interface VehicleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: VehicleFormData | null
  onSuccess: () => void
}

export function VehicleForm({ open, onOpenChange, vehicle, onSuccess }: VehicleFormProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [pending, startTransition] = useTransition()
  const isEdit = !!vehicle

  const [form, setForm] = useState({
    prefix: '',
    plate: '',
    model: '',
    year: new Date().getFullYear(),
  })

  useEffect(() => {
    if (vehicle) {
      setForm({
        prefix: vehicle.prefix,
        plate: vehicle.plate || '',
        model: vehicle.model || '',
        year: vehicle.year || 0,
      })
    } else {
      setForm({ prefix: '', plate: '', model: '', year: 0 })
    }
  }, [vehicle, open])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('prefix', form.prefix)
    formData.append('plate', form.plate)
    formData.append('model', form.model)
    formData.append('year', form.year.toString())

    startTransition(async () => {
      const res = isEdit && vehicle?._id
        ? await updateVehicleAction(vehicle._id, formData)
        : await createVehicleAction(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(isEdit ? 'Viatura atualizada!' : 'Viatura criada!')
        onOpenChange(false)
        onSuccess()
      }
    })
  }

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prefix">Prefixo</Label>
        <Input
          id="prefix"
          value={form.prefix}
          onChange={(e) => setForm({ ...form, prefix: e.target.value })}
          placeholder="Ex: 7.1301"
          pattern="\d\.\d{4}"
          title="Formato N.NNNN (ex.: 7.1301)"
          required
          disabled={isEdit}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plate">Placa</Label>
        <Input
          id="plate"
          value={form.plate}
          onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
          placeholder="ABC1D23"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">Modelo</Label>
        <Input
          id="model"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          placeholder="Ex: Toyota Hilux"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="year">Ano</Label>
        <Input
          id="year"
          type="number"
          inputMode="numeric"
          value={form.year || ''}
          onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 0 })}
          min={1900}
          max={new Date().getFullYear() + 1}
        />
      </div>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar Viatura' : 'Nova Viatura'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Atualize os dados da viatura.' : 'Preencha os dados para cadastrar uma viatura.'}
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
          <DrawerTitle>{isEdit ? 'Editar Viatura' : 'Nova Viatura'}</DrawerTitle>
          <DrawerDescription>
            {isEdit ? 'Atualize os dados da viatura.' : 'Preencha os dados para cadastrar uma viatura.'}
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
