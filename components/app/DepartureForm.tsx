'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { createDepartureAction } from '@/actions/handover-actions'
import { listVehiclesAction } from '@/actions/vehicle-actions'
import { CHECKLIST_ITEMS, PHOTO_KEYS } from '@/lib/validation'
import { useAuth } from '@/components/app/AuthContext'
import { PhotoCapture } from '@/components/app/PhotoCapture'
import { ChecklistItem } from '@/components/app/ChecklistItem'
import { OfficerFields } from '@/components/app/OfficerFields'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type PhotoState = Record<string, { file: File | null; preview: string | null }>

interface Vehicle {
  _id: string
  prefix: string
  plate: string
  model: string
  year: number
}

export function DepartureForm() {
  const { user } = useAuth()
  const [pending, startTransition] = useTransition()
  const [serviceType, setServiceType] = useState('ordinario')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [photos, setPhotos] = useState<PhotoState>(
    Object.fromEntries(PHOTO_KEYS.map((p) => [p.key, { file: null, preview: null }]))
  )
  const router = useRouter()

  const photosRef = useRef(photos)
  photosRef.current = photos

  useEffect(() => {
    listVehiclesAction().then((res) => {
      if ('vehicles' in res) setVehicles(res.vehicles as Vehicle[])
    })
  }, [])

  const setPhoto = (key: string, file: File | null) => {
    setPhotos((prev) => {
      const cur = prev[key]
      if (cur?.preview) URL.revokeObjectURL(cur.preview)
      return { ...prev, [key]: { file, preview: file ? URL.createObjectURL(file) : null } }
    })
  }

  useEffect(() => {
    return () => {
      Object.values(photosRef.current).forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview)
      })
    }
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedVehicle) {
      toast.error('Selecione uma viatura')
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set('plate', selectedVehicle.plate || selectedVehicle.prefix)
    for (const { key } of PHOTO_KEYS) {
      const f = photos[key].file
      if (f) formData.set(`photo_${key}`, f)
    }
    if (!formData.get('service_type')) {
      formData.set('service_type', 'ordinario')
    }

    startTransition(async () => {
      try {
        const res = await createDepartureAction(formData)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('Carga registrada com sucesso!')
          router.push(`/sucesso?id=${res.id}&phase=departure`)
        }
      } catch {
        toast.error('Erro inesperado. Tente novamente.')
      }
    })
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Carga de Viatura</h1>
        <p className="text-muted-foreground">Registrar saída do veículo</p>
        {user && (
          <p className="mt-1 text-sm text-muted-foreground">
            Policial: <span className="font-medium text-foreground">{user.patente} {user.nome}</span>
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Viatura</CardTitle>
            <CardDescription>Selecione a viatura e informe a kilometragem inicial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Viatura *</Label>
              <Select
                value={selectedVehicle?.prefix || ''}
                onValueChange={(prefix) => {
                  const v = vehicles.find((veh) => veh.prefix === prefix)
                  setSelectedVehicle(v || null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a viatura" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v._id} value={v.prefix}>
                      {v.prefix}{v.plate ? ` — ${v.plate}` : ''}{v.model ? ` (${v.model})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_initial">Km Inicial *</Label>
              <Input id="km_initial" name="km_initial" type="number" inputMode="numeric" required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comandante da Guarnição</CardTitle>
            <CardDescription>Patente e nome do comandante</CardDescription>
          </CardHeader>
          <CardContent>
            <OfficerFields prefix="garrison" title="" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select name="service_type" defaultValue="ordinario" onValueChange={(v) => { if (v) setServiceType(v) }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinario">Ordinário</SelectItem>
                  <SelectItem value="intensificacao_tatica">Intensificação Tática</SelectItem>
                  <SelectItem value="adm">ADM</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {serviceType === 'outros' && (
              <div className="space-y-2">
                <Label htmlFor="service_type_other">Especifique o tipo *</Label>
                <Input id="service_type_other" name="service_type_other" required />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policial Despachante da Viatura</CardTitle>
            <CardDescription>Responsável pela despacho da viatura</CardDescription>
          </CardHeader>
          <CardContent>
            <OfficerFields prefix="delivered" title="" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verificação da Viatura</CardTitle>
            <CardDescription>Marque OK ou Com Alteração em cada item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHECKLIST_ITEMS.map((item) => (
              <ChecklistItem key={item.key} slug={item.key} label={item.label} type={item.type} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotos</CardTitle>
            <CardDescription>5 fotos obrigatórias do veículo</CardDescription>
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

        <Button type="submit" size="lg" className="sticky bottom-4 w-full" disabled={pending || !selectedVehicle}>
          {pending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Registrar Carga</>
          )}
        </Button>
      </form>
    </div>
  )
}
