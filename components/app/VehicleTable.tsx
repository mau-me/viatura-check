'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Trash2 } from 'lucide-react'

export interface VehicleRow {
  _id: string
  prefix: string
  plate?: string
  model?: string
  year?: number
  isBusy?: boolean
}

interface VehicleTableProps {
  vehicles: VehicleRow[]
  onEdit: (vehicle: VehicleRow) => void
  onDelete: (vehicle: VehicleRow) => void
}

export function VehicleTable({ vehicles, onEdit, onDelete }: VehicleTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prefixo</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow key={v._id}>
              <TableCell className="font-mono font-medium">{v.prefix}</TableCell>
              <TableCell className="font-mono">{v.plate || '—'}</TableCell>
              <TableCell>{v.model || '—'}</TableCell>
              <TableCell>{v.year || '—'}</TableCell>
              <TableCell>
                <Badge variant={v.isBusy ? 'destructive' : 'outline'}>
                  {v.isBusy ? 'Em uso' : 'Disponível'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(v)} aria-label="Editar">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(v)} aria-label="Excluir">
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
