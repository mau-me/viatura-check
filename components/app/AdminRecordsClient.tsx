'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getHandoversAction, deleteHandoverAction, adminCloseHandoverAction } from '@/actions/handover-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Search, Lock, Trash2 } from 'lucide-react'

interface HandoverRecord {
  _id: string
  plate: string
  status: string
  departureOfficer: { nome: string; matricula: string }
  kilometers: { initial: number; final: number | null }
  createdAt: Date
  returnedAt: Date | null
  hasDepartureAlteration: boolean
}

type FilterStatus = 'todos' | 'abertos' | 'fechados'

export function AdminRecordsClient() {
  const [records, setRecords] = useState<HandoverRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('todos')
  const [deleteTarget, setDeleteTarget] = useState<HandoverRecord | null>(null)
  const [closeTarget, setCloseTarget] = useState<HandoverRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [closing, setClosing] = useState(false)
  const router = useRouter()

  const load = useCallback(async (q = '', f: FilterStatus = 'todos') => {
    setLoading(true)
    const res = await getHandoversAction(q, f)
    if (res.error) toast.error(res.error)
    else setRecords(res.records ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load(query, filter)
  }, [load, query, filter])

  const handleSearch = () => load(query, filter)

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteHandoverAction(deleteTarget._id)
    setDeleting(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success('Registro excluído')
      setDeleteTarget(null)
      load(query, filter)
    }
  }

  const handleConfirmClose = async () => {
    if (!closeTarget) return
    setClosing(true)
    const res = await adminCloseHandoverAction(closeTarget._id)
    setClosing(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success('Registro fechado')
      setCloseTarget(null)
      load(query, filter)
    }
  }

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Em Aberto', value: 'abertos' },
    { label: 'Fechados', value: 'fechados' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Registros de Viatura</h2>
        <Button variant="outline" size="sm" onClick={() => router.push('/carga')}>Novo Registro</Button>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {filterButtons.map((fb) => (
          <Button
            key={fb.value}
            variant={filter === fb.value ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setFilter(fb.value)}
          >
            {fb.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por placa ou nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : records.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum registro.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {records.map((r) => (
            <Card key={r._id} className="cursor-pointer" onClick={() => router.push(`/admin/${r._id}`)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold">{r.plate}</p>
                    {r.status === 'aberto' ? (
                      <Badge variant="default">
                        <Lock className="mr-1 h-3 w-3" />
                        Em Aberto
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Fechado</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{r.departureOfficer?.nome ?? '—'} · {r.departureOfficer?.matricula ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {r.kilometers.final != null && (
                      <> · Km {r.kilometers.initial}–{r.kilometers.final}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.hasDepartureAlteration && <Badge variant="destructive">Com Alteração</Badge>}
                  {r.status === 'aberto' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setCloseTarget(r) }}
                    >
                      Fechar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro <span className="font-mono">{deleteTarget?.plate}</span> e suas fotos serão
              excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={handleConfirmDelete}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!closeTarget} onOpenChange={(open) => { if (!open) setCloseTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro <span className="font-mono">{closeTarget?.plate}</span> será marcado como fechado
              sem registro de devolução. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={closing} onClick={handleConfirmClose}>
              {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
