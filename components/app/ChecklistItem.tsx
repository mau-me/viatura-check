'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  slug: string
  label: string
  value?: 'ok' | 'alteracao'
  onChange?: (value: 'ok' | 'alteracao') => void
}

export function ChecklistItem({ slug, label, value = 'ok', onChange }: Props) {
  const [status, setStatus] = useState<'ok' | 'alteracao'>(value)

  const handleChange = (v: string) => {
    const next = v === 'alteracao' ? 'alteracao' : 'ok'
    setStatus(next)
    onChange?.(next)
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium leading-tight">{label}</Label>
        <RadioGroup
          name={`check_${slug}`}
          value={status}
          onValueChange={handleChange}
          className="flex w-auto shrink-0 flex-row gap-3"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="ok" className="data-checked:bg-primary" />
            <span className="text-sm">OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="alteracao" className="data-checked:bg-destructive" />
            <span className="text-sm">Com Alteração</span>
          </div>
        </RadioGroup>
      </div>

      {status === 'alteracao' && (
        <Textarea
          name={`obs_${slug}`}
          rows={2}
          placeholder="Descreva a alteração..."
          className={cn('resize-none')}
        />
      )}
    </div>
  )
}