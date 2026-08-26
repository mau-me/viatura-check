import { requireAdmin } from '@/lib/jwt'
import { listUsers } from '@/lib/auth'
import { listVehiclesAction } from '@/actions/vehicle-actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Users2, Car } from 'lucide-react'
import { AdminRecordsClient } from '@/components/app/AdminRecordsClient'
import { UserManagementClient } from '@/components/app/UserManagementClient'
import { VehicleManagementClient } from '@/components/app/VehicleManagementClient'
import type { UserRow } from '@/components/app/UserTable'
import type { VehicleRow } from '@/components/app/VehicleTable'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  await requireAdmin()

  const defaultTab = searchParams?.tab === 'usuarios'
    ? 'usuarios'
    : searchParams?.tab === 'viaturas'
      ? 'viaturas'
      : 'registros'

  const { users } = await listUsers('', 1, 100)
  const initialUsers: UserRow[] = users.map((u) => ({
    _id: u._id,
    matricula: u.matricula,
    nome: u.nome,
    patente: u.patente,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    primeiroAcesso: u.primeiroAcesso,
    resetRequested: u.resetRequested,
  }))

  const vehiclesRes = await listVehiclesAction()
  const initialVehicles: VehicleRow[] = ('vehicles' in vehiclesRes ? vehiclesRes.vehicles : []) as VehicleRow[]

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerencie registros, usuários e viaturas do sistema</p>
      </header>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="registros">
            <FileText className="size-4" /> Registros
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users2 className="size-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="viaturas">
            <Car className="size-4" /> Viaturas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="registros" className="mt-4">
          <AdminRecordsClient />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-4">
          <UserManagementClient initialUsers={initialUsers} />
        </TabsContent>
        <TabsContent value="viaturas" className="mt-4">
          <VehicleManagementClient initialVehicles={initialVehicles} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
