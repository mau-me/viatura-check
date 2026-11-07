'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

const LEVEL_OPTIONS = [
  { value: 'vazio', label: 'Vazio' },
  { value: '1/4', label: '1/4' },
  { value: '2/4', label: '2/4' },
  { value: '3/4', label: '3/4' },
  { value: 'cheio', label: 'Cheio' },
] as const

interface Props {
  slug: string
  label: string
  type?: 'boolean' | 'level' | 'option'
  options?: readonly { value: string; label: string }[]
  value?: string
  onChange?: (value: string) => void
}

export function ChecklistItem({ slug, label, type = 'boolean', options, value, onChange }: Props) {
  const defaultValue = type === 'level' ? 'cheio' : type === 'option' ? (options?.[0]?.value || 'cartao') : 'ok'
  const [status, setStatus] = useState(value || defaultValue)

  const handleChange = (v: string) => {
    setStatus(v)
    onChange?.(v)
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className={cn(
        'flex flex-col gap-2',
        type === 'boolean' ? 'sm:flex-row sm:items-center sm:justify-between sm:gap-3' : 'sm:flex-col sm:gap-2'
      )}>
        <Label className="text-sm font-medium leading-tight">{label}</Label>
        <RadioGroup
          name={`check_${slug}`}
          value={status}
          onValueChange={handleChange}
          className="flex w-full flex-row flex-wrap gap-3"
        >
          {type === 'boolean' ? (
            <>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="ok" className="data-checked:bg-primary" />
                <span className="text-sm">OK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="alteracao" className="data-checked:bg-destructive" />
                <span className="text-sm">Com Alteração</span>
              </div>
            </>
          ) : type === 'level' ? (
            LEVEL_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={opt.value} className="data-checked:bg-primary" />
                <span className="text-sm">{opt.label}</span>
              </div>
            ))
          ) : (
            (options || []).map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={opt.value} className="data-checked:bg-primary" />
                <span className="text-sm">{opt.label}</span>
              </div>
            ))
          )}
        </RadioGroup>
      </div>

      {type === 'boolean' && status === 'alteracao' && (
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
