'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Props {
  prefix: string
  title: string
}

export function OfficerFields({ prefix, title }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}_patente`}>Patente</Label>
          <Input id={`${prefix}_patente`} name={`${prefix}_patente`} placeholder="Ex.: Sd" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}_nome`}>Nome completo</Label>
          <Input id={`${prefix}_nome`} name={`${prefix}_nome`} placeholder="Nome do policial" required />
        </div>
      </div>
    </div>
  )
}
