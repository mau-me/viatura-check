'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { submitHandoverAction } from '@/actions/handover-actions'
import { CHECKLIST_ITEMS, PHOTO_KEYS } from '@/lib/validation'
import { PhotoCapture } from '@/components/app/PhotoCapture'
import { ChecklistItem } from '@/components/app/ChecklistItem'
import { OfficerFields } from '@/components/app/OfficerFields'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type PhotoState = Record<string, { file: File | null; preview: string | null }>

export default function HomePage() {
  const [pending, startTransition] = useTransition()
  const [photos, setPhotos] = useState<PhotoState>(
    Object.fromEntries(PHOTO_KEYS.map((p) => [p.key, { file: null, preview: null }]))
  )
  const router = useRouter()

  const setPhoto = (key: string, file: File | null) => {
    setPhotos((prev) => {
      const cur = prev[key]
      if (cur?.preview) URL.revokeObjectURL(cur.preview)
      return { ...prev, [key]: { file, preview: file ? URL.createObjectURL(file) : null } }
    })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    for (const { key } of PHOTO_KEYS) {
      const f = photos[key].file
      if (f) formData.set(`photo_${key}`, f)
    }

    startTransition(async () => {
      const res = await submitHandoverAction(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Registro salvo com sucesso!')
        router.push(`/sucesso?id=${res.id}`)
      }
    })
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Carga de Viatura</h1>
        <p className="text-muted-foreground">Registre as condições do veículo</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seção 1: Viatura */}
        <Card>
          <CardHeader>
            <CardTitle>Viatura</CardTitle>
            <CardDescription>Placa ou prefixo e kilometragem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa ou Prefixo *</Label>
              <Input id="plate" name="plate" placeholder="ABC1D23" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="km_initial">Km Inicial *</Label>
                <Input id="km_initial" name="km_initial" type="number" inputMode="numeric" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="km_final">Km Final *</Label>
                <Input id="km_final" name="km_final" type="number" inputMode="numeric" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Policiais */}
        <Card>
          <CardHeader>
            <CardTitle>Policiais</CardTitle>
            <CardDescription>Quem entregou e quem recebeu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <OfficerFields prefix="officer" title="Responsável pela carga" showMatricula />
            <OfficerFields prefix="delivered" title="Entregou a viatura" />
            <OfficerFields prefix="received" title="Recebeu a viatura" />
          </CardContent>
        </Card>

        {/* Seção 3: Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Verificação da Viatura</CardTitle>
            <CardDescription>Marque OK ou Com Alteração em cada item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHECKLIST_ITEMS.map((item) => (
              <ChecklistItem key={item.key} slug={item.key} label={item.label} />
            ))}
          </CardContent>
        </Card>

        {/* Seção 4: Fotos */}
        <Card>
          <CardHeader>
            <CardTitle>Fotos</CardTitle>
            <CardDescription>5 fotos obrigatórias</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            {PHOTO_KEYS.map((p) => (
              <PhotoCapture
                key={p.key}
                label={p.label}
                value={photos[p.key].file}
                preview={photos[p.key].preview}
                onChange={(f) => setPhoto(p.key, f)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Seção 5: Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
            <CardDescription>Outras informações pertinentes</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="observations"
              rows={4}
              placeholder="Outras informações pertinentes não relacionadas aos itens listados..."
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="sticky bottom-4 w-full" disabled={pending}>
          {pending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Enviar Registro</>
          )}
        </Button>
      </form>
    </div>
  )
}