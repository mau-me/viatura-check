'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { completeReturnAction, getHandoverByIdAction } from '@/actions/handover-actions'
import { PHOTO_KEYS } from '@/lib/validation'
import { useAuth } from '@/components/app/AuthContext'
import { PhotoCapture } from '@/components/app/PhotoCapture'
import { OfficerFields } from '@/components/app/OfficerFields'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'

type PhotoState = Record<string, { file: File | null; preview: string | null }>

interface RecordData {
  _id: string
  plate: string
  status: string
  departureOfficer: { patente: string; nome: string; matricula: string }
  kilometers: { initial: number; final: number | null }
  createdAt: string
}

export function ReturnForm({ id }: { id: string }) {
  const { user } = useAuth()
  const [record, setRecord] = useState<RecordData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [photos, setPhotos] = useState<PhotoState>(
    Object.fromEntries(PHOTO_KEYS.map((p) => [p.key, { file: null, preview: null }]))
  )
  const router = useRouter()

  useEffect(() => {
    getHandoverByIdAction(id).then((res) => {
      if (res.error || !res.record) {
        toast.error('Registro não encontrado')
        router.push('/')
      } else {
        const r = res.record as RecordData
        if (r.status !== 'aberto') {
          toast.error('Este registro já foi finalizado')
          router.push('/')
          return
        }
        if (r.departureOfficer?.matricula !== user?.matricula) {
          toast.error('Apenas o policial que fez a carga pode registrar a devolução')
          router.push('/')
          return
        }
        setRecord(r)
      }
      setLoading(false)
    })
  }, [id, user, router])

  const photosRef = useRef(photos)
  photosRef.current = photos

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
    const formData = new FormData(e.currentTarget)
    for (const { key } of PHOTO_KEYS) {
      const f = photos[key].file
      if (f) formData.set(`return_photo_${key}`, f)
    }

    startTransition(async () => {
      try {
        const res = await completeReturnAction(id, formData)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('Devolução registrada com sucesso!')
          router.push(`/sucesso?id=${id}&phase=return`)
        }
      } catch (error) {
        console.error('Erro ao registrar devolução:', error)
        toast.error(`Erro inesperado: ${(error as Error).message}. Tente novamente.`)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!record) return null

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <Button variant="outline" onClick={() => router.push('/')} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar ao Dashboard
      </Button>

      <header className="text-center">
        <h1 className="text-2xl font-bold">Devolução de Viatura</h1>
        <p className="text-muted-foreground">Registrar retorno do veículo</p>
      </header>

      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-lg font-bold">{record.plate}</p>
              <p className="text-sm text-muted-foreground">
                Km inicial: {record.kilometers.initial}
              </p>
              <p className="text-xs text-muted-foreground">
                Carga em {format(new Date(record.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Kilometragem Final</CardTitle>
            <CardDescription>
              Informe a kilometragem atual do veículo (mínimo: {record.kilometers.initial})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="km_final">Km Final *</Label>
              <Input
                id="km_final"
                name="km_final"
                type="number"
                inputMode="numeric"
                min={record.kilometers.initial}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policial que Recebeu</CardTitle>
            <CardDescription>Quem recebeu a viatura na devolução</CardDescription>
          </CardHeader>
          <CardContent>
            <OfficerFields prefix="return" title="" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotos da Devolução</CardTitle>
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
              name="return_observations"
              rows={4}
              placeholder="Observações sobre a devolução..."
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="sticky bottom-4 w-full" disabled={pending}>
          {pending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Finalizar Devolução</>
          )}
        </Button>
      </form>
    </div>
  )
}
