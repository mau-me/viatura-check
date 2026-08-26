'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHandoverByIdAction } from '@/actions/handover-actions'
import { CHECKLIST_ITEMS, PHOTO_KEYS } from '@/lib/validation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, Lock, CheckCircle2, ArrowLeft } from 'lucide-react'

type RecordData = {
  _id: string
  plate: string
  status: string
  departureOfficer: { patente: string; nome: string; matricula: string }
  deliveringOfficer?: { patente: string; nome: string }
  garrisonCommander?: { patente: string; nome: string }
  serviceType?: string
  serviceTypeOther?: string
  returnOfficer?: { patente: string; nome: string }
  kilometers: { initial: number; final: number | null }
  departureChecklist: Record<string, string>
  departureChecklistObs?: Record<string, string>
  departureObservations?: string
  departurePhotos?: Record<string, string>
  returnPhotos?: Record<string, string>
  returnObservations?: string
  createdAt: Date
  returnedAt?: Date
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

  const isOpen = record.status === 'aberto'

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Button variant="outline" onClick={() => router.push('/admin')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono">{record.plate}</CardTitle>
            {isOpen ? (
              <Badge variant="default"><Lock className="mr-1 h-3 w-3" /> Em Aberto</Badge>
            ) : (
              <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3" /> Fechado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Info label="Kilometragem" value={`${record.kilometers.initial}${record.kilometers.final != null ? ` → ${record.kilometers.final}` : ''}`} />
            <Info label="Carga registrada em" value={format(new Date(record.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
            {record.returnedAt && (
              <Info label="Devolvido em" value={format(new Date(record.returnedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Carga (Saída)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Info label="Policial (carga)" value={`${record.departureOfficer.patente} ${record.departureOfficer.nome} · ${record.departureOfficer.matricula}`} />
            <Info label="Entregou a viatura" value={officerLabelMinimal(record.deliveringOfficer)} />
            <Info label="Comandante" value={officerLabelMinimal(record.garrisonCommander)} />
            <Info label="Tipo de serviço" value={serviceLabel(record)} />
          </div>
          <Info label="Observações" value={record.departureObservations} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist (Carga)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const status = record.departureChecklist?.[item.key]
            return (
              <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  {status === 'alteracao' && record.departureChecklistObs?.[item.key] && (
                    <p className="text-sm text-destructive">{record.departureChecklistObs[item.key]}</p>
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
        <CardHeader>
          <CardTitle>Fotos (Carga)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PHOTO_KEYS.map((p) => {
            const pid = record.departurePhotos?.[p.key]
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

      {record.returnOfficer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 rotate-180" />
                Devolução (Entrada)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Info label="Policial (devolução)" value={`${record.returnOfficer.patente} ${record.returnOfficer.nome}`} />
                <Info label="Kilometragem final" value={record.kilometers.final?.toString()} />
              </div>
              <Info label="Observações" value={record.returnObservations} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fotos (Devolução)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PHOTO_KEYS.map((p) => {
                const pid = record.returnPhotos?.[p.key]
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
        </>
      )}
    </div>
  )
}

function officerLabelMinimal(o?: { patente?: string; nome?: string }) {
  if (!o) return undefined
  return [o.patente, o.nome].filter(Boolean).join(' ') || undefined
}

function serviceLabel(r: RecordData) {
  const map: Record<string, string> = {
    ordinario: 'Ordinário',
    intensificacao_tatica: 'Intensificação Tática',
    adm: 'ADM',
    outros: r.serviceTypeOther || 'Outros',
  }
  return map[r.serviceType || ''] || r.serviceType
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
