'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getHandoversAction, deleteHandoverAction } from '@/actions/handover-actions'
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
import { Loader2, Search } from 'lucide-react'

interface HandoverRecord {
  _id: string
  plate: string
  officer: { nome: string; matricula: string }
  kilometers: { initial: number; final: number }
  createdAt: Date
  hasAlteration: boolean
}

export function AdminRecordsClient() {
  const [records, setRecords] = useState<HandoverRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<HandoverRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const res = await getHandoversAction(q)
    if (res.error) toast.error(res.error)
    else setRecords(res.records ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSearch = () => load(query)

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteHandoverAction(deleteTarget._id)
    setDeleting(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success('Registro excluído')
      setDeleteTarget(null)
      load(query)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Registros de Viatura</h2>
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>Novo Registro</Button>
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
                  <p className="font-mono font-semibold">{r.plate}</p>
                  <p className="text-sm text-muted-foreground">{r.officer.nome} · {r.officer.matricula}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Km {r.kilometers.initial}–{r.kilometers.final}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.hasAlteration && <Badge variant="destructive">Com Alteração</Badge>}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
                  >
                    Excluir
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
    </div>
  )
}
