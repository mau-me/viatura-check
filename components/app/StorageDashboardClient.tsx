'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getOrphanPhotosAction,
  getPhotoCleanupCandidatesAction,
  getStorageStatsAction,
  purgeHandoverPhotosAction,
  purgeOrphanPhotosAction,
} from '@/actions/storage-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  Images,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'

interface StorageStats {
  limitMb: number
  limitBytes: number
  usedBytes: number
  freeBytes: number
  percent: number
  dataSize: number
  indexSize: number
  storageSize: number
  diskUsedBytes: number
  objects: number
  photos: { count: number; bytes: number }
  records: { total: number; open: number; closed: number; purged: number; withPhotos: number }
  avgPhotoBytesPerRecord: number
  estimatedRecordsRemaining: number | null
  backupTtlHours: number
}

interface CleanupRecord {
  _id: string
  prefix: string
  plate: string
  officer: string
  createdAt: string | Date
  returnedAt: string | Date | null
  photoCount: number
  photoBytes: number
  phases: ('departure' | 'return')[]
  hasBackup: boolean
  backupAt: string | Date | null
  purgedDeparture: boolean
  purgedReturn: boolean
}

interface OrphanInfo {
  count: number
  bytes: number
  items: { id: string; filename: string; bytes: number; uploadDate: string | Date }[]
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, index)
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value: string | Date | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '—'
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function StorageDashboardClient({ maxSelection }: { maxSelection: number }) {
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [records, setRecords] = useState<CleanupRecord[]>([])
  const [orphans, setOrphans] = useState<OrphanInfo | null>(null)
  const [orphanSafe, setOrphanSafe] = useState(true)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [backupAck, setBackupAck] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purging, setPurging] = useState(false)
  const [orphanOpen, setOrphanOpen] = useState(false)
  const [orphanPurging, setOrphanPurging] = useState(false)

  const load = useCallback(async (search = '') => {
    setLoading(true)
    const [statsRes, candidatesRes, orphansRes] = await Promise.all([
      getStorageStatsAction(),
      getPhotoCleanupCandidatesAction(search),
      getOrphanPhotosAction(),
    ])

    if ('error' in statsRes) toast.error(statsRes.error)
    else setStats(statsRes.stats as StorageStats)

    if ('error' in candidatesRes) {
      toast.error(candidatesRes.error)
    } else {
      const list = candidatesRes.records as CleanupRecord[]
      setRecords(list)
      setSelected((prev) => prev.filter((id) => list.some((record) => record._id === id)))
    }

    if ('error' in orphansRes) {
      toast.error(orphansRes.error)
    } else {
      setOrphans(orphansRes.orphans as OrphanInfo)
      setOrphanSafe(orphansRes.safe)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selectedRecords = records.filter((record) => selected.includes(record._id))
  const selectedPhotos = selectedRecords.reduce((sum, record) => sum + record.photoCount, 0)
  const selectedBytes = selectedRecords.reduce((sum, record) => sum + record.photoBytes, 0)
  const allSelected = records.length > 0 && selected.length === records.length

  const toggleRecord = (id: string) => {
    if (!selected.includes(id) && selected.length >= maxSelection) {
      toast.error(`Selecione no máximo ${maxSelection} registros por vez`)
      return
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
    setBackupAck(false)
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected([])
    } else {
      const ids = records.map((record) => record._id)
      if (ids.length > maxSelection) {
        toast.error(`Selecionados os primeiros ${maxSelection} registros (limite por limpeza)`)
      }
      setSelected(ids.slice(0, maxSelection))
    }
    setBackupAck(false)
  }

  const handleDownload = () => {
    if (selected.length === 0) return
    window.location.href = `/api/admin/photos/export?ids=${selected.join(',')}`
    toast.success('Download iniciado. Confirme abaixo após concluir.')
  }

  const handlePurge = async () => {
    if (selected.length === 0) return
    setPurging(true)
    const res = await purgeHandoverPhotosAction(selected)
    setPurging(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(`${res.photos} foto(s) removida(s) · ${formatBytes(res.bytes)} liberados`)
    setPurgeOpen(false)
    setSelected([])
    setBackupAck(false)
    load(query)
  }

  const handlePurgeOrphans = async () => {
    setOrphanPurging(true)
    const res = await purgeOrphanPhotosAction()
    setOrphanPurging(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(`${res.photos} foto(s) órfã(s) removida(s) · ${formatBytes(res.bytes)} liberados`)
    setOrphanOpen(false)
    load(query)
  }

  const percent = stats ? Math.min(100, Math.max(0, stats.percent)) : 0
  const barColor =
    percent >= 90 ? 'bg-destructive' : percent >= 80 ? 'bg-amber-500' : 'bg-primary'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Armazenamento</h2>
          <p className="text-xs text-muted-foreground">
            Uso estimado do banco e limpeza de fotos antigas.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(query)} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="h-4 w-4" />
                Uso do banco
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats ? (
                <>
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-2xl font-bold">{percent.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(stats.usedBytes)} de {stats.limitMb} MB · livre{' '}
                      {formatBytes(stats.freeBytes)}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-2 rounded-full transition-all', barColor)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {percent >= 80 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Espaço {percent >= 90 ? 'crítico' : 'baixo'}. Baixe e remova fotos de registros
                        fechados para liberar espaço.
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Estimativa via <span className="font-mono">dbStats</span> (dados + índices). O Atlas
                    calcula o limite de {stats.limitMb} MB da mesma forma, mas as métricas podem atrasar
                    até ~20 min.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Não foi possível carregar o uso.</p>
              )}
            </CardContent>
          </Card>

          {stats && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Images className="h-3.5 w-3.5" />
                    Fotos no GridFS
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatBytes(stats.photos.bytes)}</p>
                  <p className="text-xs text-muted-foreground">{stats.photos.count} arquivos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    Dados + índices
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatBytes(stats.usedBytes)}</p>
                  <p className="text-xs text-muted-foreground">
                    Dados {formatBytes(stats.dataSize)} · Índices {formatBytes(stats.indexSize)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Em disco (comprimido)</p>
                  <p className="mt-1 text-lg font-semibold">{formatBytes(stats.diskUsedBytes)}</p>
                  <p className="text-xs text-muted-foreground">{stats.objects} documentos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Registros</p>
                  <p className="mt-1 text-lg font-semibold">{stats.records.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.records.open} abertos · {stats.records.closed} fechados ·{' '}
                    {stats.records.purged} c/ fotos removidas
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {stats && (
            <p className="text-xs text-muted-foreground">
              Média de {formatBytes(stats.avgPhotoBytesPerRecord)} por registro com fotos.
              {stats.estimatedRecordsRemaining !== null && (
                <> Espaço livre estimado para ~{stats.estimatedRecordsRemaining} registros.</>
              )}
            </p>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Limpeza de fotos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Apenas registros fechados. Baixe o ZIP antes: os dados do registro permanecem no banco,
                mas as fotos são apagadas permanentemente do GridFS.
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por prefixo, placa ou policial..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && load(query)}
                />
              </div>

              {records.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum registro fechado com fotos disponíveis.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {selected.length}/{maxSelection} selecionado(s) · {selectedPhotos} foto(s) ·{' '}
                      {formatBytes(selectedBytes)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {records.map((record) => (
                      <div
                        key={record._id}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={selected.includes(record._id)}
                          onCheckedChange={() => toggleRecord(record._id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-sm font-semibold">
                              {record.prefix || record.plate}
                            </p>
                            {record.prefix && record.plate && record.plate !== record.prefix && (
                              <span className="text-xs text-muted-foreground">{record.plate}</span>
                            )}
                            <Badge variant="secondary">
                              {record.photoCount} fotos · {formatBytes(record.photoBytes)}
                            </Badge>
                            {record.hasBackup ? (
                              <Badge variant="outline">Backup recente</Badge>
                            ) : (
                              <Badge variant="outline">Sem backup</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {record.officer || '—'} · {formatDate(record.createdAt)}
                            {record.purgedDeparture || record.purgedReturn
                              ? ' · fotos parcialmente removidas'
                              : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={selected.length === 0}
                      onClick={handleDownload}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar fotos (.zip)
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={selected.length === 0 || !backupAck}
                      onClick={() => setPurgeOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover fotos
                    </Button>
                  </div>

                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      className="mt-0.5"
                      checked={backupAck}
                      onCheckedChange={(checked) => setBackupAck(!!checked)}
                    />
                    <span>
                      Confirmo que baixei as fotos selecionadas e entendo que elas serão removidas do
                      banco, mantendo o registro para consulta.
                    </span>
                  </label>
                </>
              )}

              {stats && (
                <p className="text-xs text-muted-foreground">
                  O backup é aceito por até {stats.backupTtlHours}h após o download.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Fotos órfãs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!orphans || orphans.count === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma foto órfã encontrada (arquivos sem vínculo com registros).
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    {orphans.count} arquivo(s) sem vínculo · {formatBytes(orphans.bytes)}.
                  </p>
                  {!orphanSafe && (
                    <p className="text-xs text-destructive">
                      Limpeza bloqueada: nenhum registro encontrado no banco.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!orphanSafe}
                    onClick={() => setOrphanOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar fotos órfãs
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fotos?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPhotos} foto(s) de {selected.length} registro(s) serão removidas do banco
              ({formatBytes(selectedBytes)}). Os registros e checklists permanecem disponíveis. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={purging} onClick={handlePurge}>
              {purging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={orphanOpen} onOpenChange={setOrphanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar fotos órfãs?</AlertDialogTitle>
            <AlertDialogDescription>
              {orphans?.count ?? 0} arquivo(s) sem vínculo ({formatBytes(orphans?.bytes ?? 0)}) serão
              removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={orphanPurging}
              onClick={handlePurgeOrphans}
            >
              {orphanPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
