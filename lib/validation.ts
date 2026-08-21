import { z } from 'zod'

export const CHECKLIST_ITEMS = [
  { key: 'oleo_motor', label: 'Óleo do Motor' },
  { key: 'arrefecimento', label: 'Arrefecimento' },
  { key: 'pneus', label: 'Condições dos Pneus' },
  { key: 'partida_motor', label: 'Partida e Funcionamento do Motor' },
  { key: 'freios', label: 'Freios' },
  { key: 'identificacao_visual', label: 'Identificação Visual' },
  { key: 'limpeza', label: 'Limpeza' },
] as const

export const PHOTO_KEYS = [
  { key: 'frente', label: 'Frente' },
  { key: 'fundo', label: 'Fundo' },
  { key: 'lateral_esquerda', label: 'Lateral Esquerda' },
  { key: 'lateral_direita', label: 'Lateral Direita' },
  { key: 'painel', label: 'Painel do Veículo' },
] as const

const statusSchema = z.enum(['ok', 'alteracao'])

const officerSchema = z.object({
  patente: z.string().trim().min(1, 'Patente obrigatória').max(30),
  nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
  matricula: z.string().trim().max(20).optional().or(z.literal('')),
})

const officerRequiredMatriculaSchema = officerSchema.extend({
  matricula: z.string().trim().min(1, 'Matrícula obrigatória').max(20),
})

export const handoverSchema = z.object({
  plate: z.string().trim().min(3, 'Placa/prefixo obrigatório').max(15),
  officer: officerRequiredMatriculaSchema,
  deliveringOfficer: officerSchema,
  receivingOfficer: officerSchema,
  kilometers: z
    .object({
      initial: z.coerce.number().int().min(0, 'Kilometragem inicial inválida'),
      final: z.coerce.number().int().min(0, 'Kilometragem final inválida'),
    })
    .refine((k) => k.final >= k.initial, {
      message: 'Kilometragem final não pode ser menor que a inicial',
      path: ['final'],
    }),
  checklist: z.record(z.string(), statusSchema),
  checklistObservations: z.record(z.string(), z.string().trim().max(500)).optional(),
  observations: z.string().trim().max(2000).optional().or(z.literal('')),
})

export type HandoverInput = z.infer<typeof handoverSchema>

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
  patente: z.string().trim().min(1, 'Patente obrigatória').max(30).toUpperCase(),
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