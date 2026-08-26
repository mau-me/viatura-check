'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getHandoversAction, getOpenHandoverByOfficer } from '@/actions/handover-actions'
import { useAuth } from '@/components/app/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Plus, ArrowRight, Car, Clock, CheckCircle2 } from 'lucide-react'

interface OpenRecord {
  _id: string
  plate: string
  kilometers: { initial: number; final: number | null }
  createdAt: string
}

interface HistoryRecord {
  _id: string
  plate: string
  status: string
  departureOfficer: { nome: string; matricula: string }
  kilometers: { initial: number; final: number | null }
  createdAt: string
  returnedAt: string | null
}

export function UserDashboardClient() {
  const { user } = useAuth()
  const router = useRouter()
  const [openRecord, setOpenRecord] = useState<OpenRecord | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [openRes, historyRes] = await Promise.all([
      getOpenHandoverByOfficer(user.matricula),
      getHandoversAction('', 'fechados'),
    ])

    if (openRes.error) toast.error(openRes.error)
    else setOpenRecord(openRes.record as OpenRecord | null)

    if (historyRes.error) toast.error(historyRes.error)
    else {
      const myRecords = (historyRes.records ?? []).filter(
        (r: HistoryRecord) => r.departureOfficer?.matricula === user.matricula
      )
      setHistory(myRecords)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Controle de viaturas</p>
      </header>

      {openRecord ? (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-5 w-5" />
                Viatura em Aberto
              </CardTitle>
              <Badge variant="default">
                <Clock className="mr-1 h-3 w-3" />
                Em uso
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-mono text-lg font-bold">{openRecord.plate}</p>
              <p className="text-sm text-muted-foreground">
                Km inicial: {openRecord.kilometers.initial}
              </p>
              <p className="text-xs text-muted-foreground">
                Carga registrada em{' '}
                {format(new Date(openRecord.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push(`/devolucao/${openRecord._id}`)}
            >
              Devolver Viatura
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma viatura em aberto</p>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={() => router.push('/carga')}
        disabled={!!openRecord}
      >
        <Plus className="mr-2 h-4 w-4" />
        Nova Carga
      </Button>

      {openRecord && (
        <p className="text-center text-xs text-muted-foreground">
          Finalize a viatura em aberto antes de registrar outra carga.
        </p>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Histórico</h2>
          {history.map((r) => (
            <Card key={r._id} className="cursor-pointer" onClick={() => router.push(`/admin/${r._id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-mono font-semibold">{r.plate}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    {r.kilometers.final != null && (
                      <> · Km {r.kilometers.initial}–{r.kilometers.final}</>
                    )}
                  </p>
                </div>
                <Badge variant="secondary">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Devolvido
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
