'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHandoverByIdAction } from '@/actions/handover-actions'
import { CHECKLIST_ITEMS, PHOTO_KEYS } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type RecordData = {
  _id: string
  plate: string
  officer: { patente: string; nome: string; matricula: string }
  deliveringOfficer?: { patente: string; nome: string; matricula?: string }
  receivingOfficer?: { patente: string; nome: string; matricula?: string }
  kilometers: { initial: number; final: number }
  checklist: Record<string, string>
  checklistObservations?: Record<string, string>
  observations?: string
  photos?: Record<string, string>
  createdAt: Date
}

export function HandoverDetailClient({ id }: { id: string }) {
  const [record, setRecord] = useState<RecordData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getHandoverByIdAction(id).then((res) => {
      if (res.error) router.push('/admin')
      else setRecord(res.record as RecordData)
      setLoading(false)
    })
  }, [id, router])

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!record) return null

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Button variant="outline" onClick={() => router.push('/admin')}>← Voltar</Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono">{record.plate}</CardTitle>
          <CardDescription>
            Registro de {format(new Date(record.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Info label="Responsável" value={`${record.officer.patente} ${record.officer.nome} · ${record.officer.matricula}`} />
            <Info label="Entregou" value={officerLabel(record.deliveringOfficer)} />
            <Info label="Recebeu" value={officerLabel(record.receivingOfficer)} />
          </div>
          <Info label="Kilometragem" value={`${record.kilometers.initial} → ${record.kilometers.final}`} />
          {record.observations && <Info label="Outras informações" value={record.observations} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const status = record.checklist?.[item.key]
            return (
              <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  {status === 'alteracao' && record.checklistObservations?.[item.key] && (
                    <p className="text-sm text-destructive">{record.checklistObservations[item.key]}</p>
                  )}
                </div>
                <Badge variant={status === 'ok' ? 'default' : 'destructive'}>
                  {status === 'ok' ? 'OK' : 'Com Alteração'}
                </Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fotos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PHOTO_KEYS.map((p) => {
            const pid = record.photos?.[p.key]
            if (!pid) return null
            return (
              <div key={p.key} className="space-y-1">
                <p className="text-sm font-medium">{p.label}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${pid}`} alt={p.label} className="w-full rounded-lg border object-contain" loading="lazy" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function officerLabel(o?: { patente?: string; nome?: string; matricula?: string }) {
  if (!o) return undefined
  const parts = [o.patente, o.nome].filter(Boolean).join(' ')
  return o.matricula ? `${parts} · ${o.matricula}` : parts || undefined
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
