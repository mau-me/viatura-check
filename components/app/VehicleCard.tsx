'use client'

import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import type { VehicleRow } from './VehicleTable'

interface VehicleCardProps {
  vehicle: VehicleRow
  onEdit: (vehicle: VehicleRow) => void
  onDelete: (vehicle: VehicleRow) => void
}

export function VehicleCard({ vehicle, onEdit, onDelete }: VehicleCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div>
        <p className="font-mono font-medium">{vehicle.prefix}</p>
        <p className="text-sm text-muted-foreground">
          {vehicle.plate || '—'} &middot; {vehicle.model || '—'} &middot; {vehicle.year || '—'}
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(vehicle)}>
          <Pencil className="size-4" /> Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(vehicle)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
