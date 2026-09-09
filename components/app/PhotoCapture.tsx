'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { cn, compressImage } from '@/lib/utils'

interface Props {
  label: string
  value: File | null
  preview: string | null
  onChange: (file: File | null) => void
}

export function PhotoCapture({ label, value, preview, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (file: File | null) => {
    if (!file) { onChange(null); return }
    try {
      const compressed = await compressImage(file)
      onChange(compressed)
    } catch (error) {
      console.error(`Erro ao comprimir ${label}:`, error)
      onChange(file)
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-center',
        value ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="max-h-40 rounded-md object-contain" />
      ) : (
        <>
          <Camera className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">Toque para tirar foto</span>
        </>
      )}
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange(null)
          }}
          className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-white"
        >
          Remover
        </button>
      )}
    </div>
  )
}