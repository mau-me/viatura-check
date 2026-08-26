'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTransition } from 'react'
import { Plus, Search, Loader2, Car } from 'lucide-react'
import { toast } from 'sonner'
import { listVehiclesAction, deleteVehicleAction } from '@/actions/vehicle-actions'
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
import { VehicleTable, type VehicleRow } from './VehicleTable'
import { VehicleCard } from './VehicleCard'
import { VehicleForm } from './VehicleForm'
import { useMediaQuery } from '@/hooks/use-media-query'

interface VehicleManagementClientProps {
  initialVehicles: VehicleRow[]
}

export function VehicleManagementClient({ initialVehicles }: VehicleManagementClientProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [vehicles, setVehicles] = useState<VehicleRow[]>(initialVehicles)
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<VehicleRow | null>(null)
  const [pending, startTransition] = useTransition()

  const refresh = useCallback(async (search = query) => {
    const res = await listVehiclesAction(search)
    if ('vehicles' in res && res.vehicles) {
      setVehicles(res.vehicles as VehicleRow[])
    }
  }, [query])

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => refresh(query))
    }, 300)
    return () => clearTimeout(t)
  }, [query, refresh])

  const handleEdit = (vehicle: VehicleRow) => {
    setEditingVehicle(vehicle)
    setFormOpen(true)
  }

  const handleDelete = () => {
    if (!deletingVehicle) return
    startTransition(async () => {
      const res = await deleteVehicleAction(deletingVehicle._id)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Viatura excluída!')
        setDeletingVehicle(null)
        await refresh()
      }
    })
  }

  const handleFormSuccess = () => {
    setEditingVehicle(null)
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
            placeholder="Buscar por prefixo, placa ou modelo..."
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingVehicle(null); setFormOpen(true) }} className="shrink-0">
          <Plus className="size-4" /> Nova Viatura
        </Button>
      </div>

      {pending && vehicles.length === 0 ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <Car className="size-8" />
          <p>Nenhuma viatura encontrada.</p>
        </div>
      ) : isDesktop ? (
        <VehicleTable
          vehicles={vehicles}
          onEdit={handleEdit}
          onDelete={(v) => setDeletingVehicle(v)}
        />
      ) : (
        <div className="grid gap-3">
          {vehicles.map((v) => (
            <VehicleCard
              key={v._id}
              vehicle={v}
              onEdit={handleEdit}
              onDelete={(vehicle) => setDeletingVehicle(vehicle)}
            />
          ))}
        </div>
      )}

      <VehicleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editingVehicle}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deletingVehicle} onOpenChange={(o) => !o && setDeletingVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a viatura{' '}
              <span className="font-medium text-foreground">{deletingVehicle?.prefix}</span>? Esta ação
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
