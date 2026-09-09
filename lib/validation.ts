import { z } from 'zod'

export const PATENTE_OPTIONS = ['SD', 'CB', 'SGT', 'ST', 'ASP', 'TEN', 'CAP', 'MAJ', 'TEN CEL', 'CEL'] as const

export const CHECKLIST_ITEMS = [
  { key: 'oleo_motor', label: 'Óleo do Motor', type: 'boolean' as const },
  { key: 'arrefecimento', label: 'Arrefecimento', type: 'boolean' as const },
  { key: 'pneus', label: 'Condições dos Pneus', type: 'boolean' as const },
  { key: 'partida_motor', label: 'Partida e Funcionamento do Motor', type: 'boolean' as const },
  { key: 'freios', label: 'Freios', type: 'boolean' as const },
  { key: 'identificacao_visual', label: 'Identificação Visual (Plotagem)', type: 'boolean' as const },
  { key: 'limpeza', label: 'Limpeza', type: 'boolean' as const },
  { key: 'iluminacao', label: 'Iluminação (Farol, Lanterna e Piscas)', type: 'boolean' as const },
  { key: 'retrovisores', label: 'Retrovisores (Condição, Regulagem e Espelhos)', type: 'boolean' as const },
  { key: 'giroflex_sirene', label: 'Giroflex e Sirene', type: 'boolean' as const },
  { key: 'combustivel', label: 'Combustível', type: 'level' as const },
  { key: 'ad_blue', label: 'AD Blue (ARLA)', type: 'level' as const },
] as const

export const PHOTO_KEYS = [
  { key: 'frente', label: 'Frente' },
  { key: 'fundo', label: 'Fundo' },
  { key: 'lateral_esquerda', label: 'Lateral Esquerda' },
  { key: 'lateral_direita', label: 'Lateral Direita' },
  { key: 'painel', label: 'Painel do Veículo (Aceso e com Hodômetro Visível)' },
] as const

const statusSchema = z.enum(['ok', 'alteracao', 'vazio', '1/4', '2/4', '3/4', 'cheio'])

const officerLoginSchema = z.object({
  patente: z.enum(PATENTE_OPTIONS, 'Patente obrigatória'),
  nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
  matricula: z.string().trim().min(1, 'Matrícula obrigatória').max(20),
})

const officerMinimalSchema = z.object({
  patente: z.enum(PATENTE_OPTIONS, 'Patente obrigatória'),
  nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
})

export const departureSchema = z.object({
  plate: z.string().trim().min(3, 'Placa/prefixo obrigatório').max(15),
  departureOfficer: officerLoginSchema,
  deliveringOfficer: officerMinimalSchema,
  garrisonCommander: officerMinimalSchema,
  serviceType: z.enum(['ordinario', 'intensificacao_tatica', 'adm', 'outros']),
  serviceTypeOther: z.string().trim().max(200).optional().or(z.literal('')),
  km_initial: z.coerce.number().int().min(0, 'Kilometragem inicial inválida'),
  departureChecklist: z.record(z.string(), statusSchema),
  departureChecklistObs: z.record(z.string(), z.string().trim().max(500)).optional(),
  departureObservations: z.string().trim().max(2000).optional().or(z.literal('')),
})

export type DepartureInput = z.infer<typeof departureSchema>

export const returnSchema = z.object({
  km_final: z.coerce.number().int().min(0, 'Kilometragem final inválida'),
  returnOfficer: officerMinimalSchema,
  returnObservations: z.string().trim().max(2000).optional().or(z.literal('')),
})

export type ReturnInput = z.infer<typeof returnSchema>

export const loginSchema = z.object({
  matricula: z.string().trim().min(1, 'Matrícula obrigatória'),
  password: z.string().nullish(),
})

export const setupPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Pelo menos 1 maiúscula')
    .regex(/[0-9]/, 'Pelo menos 1 número'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export const createUserSchema = z.object({
  matricula: z.string().trim().min(1, 'Matrícula obrigatória').max(20).toUpperCase(),
  nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
  patente: z.enum(PATENTE_OPTIONS, 'Patente obrigatória'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean().default(true),
})

export const updateUserSchema = createUserSchema.partial().omit({ matricula: true })

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Pelo menos 1 maiúscula')
    .regex(/[0-9]/, 'Pelo menos 1 número'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type SetupPasswordInput = z.infer<typeof setupPasswordSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

const vehiclePrefixRegex = /^\d\.\d{4}$/

export const vehicleSchema = z.object({
  prefix: z.string().trim().regex(vehiclePrefixRegex, 'Prefixo no formato N.NNNN (ex.: 7.1301)'),
  plate: z.string().trim().max(15).toUpperCase().optional().or(z.literal('')),
  model: z.string().trim().max(100).optional().or(z.literal('')),
  year: z.coerce.number().int().min(1900, 'Ano inválido').max(new Date().getFullYear() + 1, 'Ano inválido').optional(),
})

export type VehicleInput = z.infer<typeof vehicleSchema>
