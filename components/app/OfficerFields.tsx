'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PATENTE_OPTIONS } from '@/lib/validation'

interface Props {
  prefix: string
  title: string
}

export function OfficerFields({ prefix, title }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}_patente`}>Patente</Label>
          <Select name={`${prefix}_patente`}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {PATENTE_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}_nome`}>Nome de Guerra</Label>
          <Input id={`${prefix}_nome`} name={`${prefix}_nome`} placeholder="Nome do policial" required />
        </div>
      </div>
    </div>
  )
}
