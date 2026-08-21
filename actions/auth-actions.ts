'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  loginSchema,
  setupPasswordSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from '@/lib/validation'
import {
  findUserByMatricula,
  verifyPassword,
  hashPassword,
  setSessionCookie,
  clearSessionCookie,
  setUserPassword,
  updateLastLogin,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  changePassword,
  requireAdmin,
} from '@/lib/auth'

export async function loginAction(_prev: unknown, formData: FormData) {
  try {
    const raw = {
      matricula: formData.get('matricula'),
      password: formData.get('password'),
    }

    const parsed = loginSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const { matricula, password } = parsed.data
    const cleanMatricula = matricula.trim().toUpperCase()
    const user = await findUserByMatricula(cleanMatricula)

    if (!user) {
      return { error: 'Matrícula ou senha incorretos' }
    }

    if (!user.isActive) {
      return { error: 'Usuário inativo. Contate o administrador.' }
    }

    // Primeira submissão (sem senha) - detecta qual estado mostrar
    if (!password) {
      if (!user.passwordHash) {
        return { success: true, isFirstAccess: true, userCPF: cleanMatricula }
      }
      return { success: true, needsPassword: true, userCPF: cleanMatricula }
    }

    // Senha informada - valida
    if (!user.passwordHash) {
      return { error: 'Matrícula ou senha inválidos' }
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return { error: 'Matrícula ou senha incorretos' }
    }

    await setSessionCookie(
      { sub: user._id.toString(), matricula: user.matricula, nome: user.nome, role: user.role },
      '7d'
    )
    await updateLastLogin(user._id.toString())

    return { success: true, redirectTo: '/' }
  } catch (error) {
    console.error('Erro no login:', error)
    return { error: 'Erro ao fazer login. Tente novamente.' }
  }
}

export async function setupPasswordAction(_prev: unknown, formData: FormData) {
  try {
    const raw = {
      matricula: formData.get('matricula'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    }

    const parsed = setupPasswordSchema.safeParse({ password: raw.password, confirmPassword: raw.confirmPassword })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const cleanMatricula = (raw.matricula as string || '').trim().toUpperCase()
    if (!cleanMatricula) {
      return { error: 'Matrícula não informada.' }
    }

    const user = await findUserByMatricula(cleanMatricula)
    if (!user) {
      return { error: 'Usuário não encontrado.' }
    }
    if (!user.isActive) {
      return { error: 'Usuário inativo. Contate o administrador.' }
    }
    if (user.passwordHash) {
      return { error: 'Senha já definida. Faça login normalmente.' }
    }

    const { password } = parsed.data
    const passwordHash = await hashPassword(password)
    await setUserPassword(user._id.toString(), passwordHash)

    await setSessionCookie(
      { sub: user._id.toString(), matricula: user.matricula, nome: user.nome, role: user.role },
      '7d'
    )
    await updateLastLogin(user._id.toString())

    return { success: true, redirectTo: '/' }
  } catch (error) {
    console.error('Erro ao definir senha:', error)
    return { error: 'Erro ao definir senha. Tente novamente.' }
  }
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect('/login')
}

export async function createUserAction(formData: FormData) {
  try {
    await requireAdmin()

    const raw = {
      matricula: formData.get('matricula'),
      nome: formData.get('nome'),
      patente: formData.get('patente'),
      email: formData.get('email') || '',
      role: formData.get('role'),
      isActive: formData.get('isActive') === 'on',
    }

    const parsed = createUserSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const existing = await findUserByMatricula(parsed.data.matricula)
    if (existing) {
      return { error: 'Matrícula já cadastrada' }
    }

    await createUser(parsed.data)
    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao criar usuário' }
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    await requireAdmin()

    const id = formData.get('id') as string
    if (!id) return { error: 'ID obrigatório' }

    const raw = {
      nome: formData.get('nome'),
      patente: formData.get('patente'),
      email: formData.get('email') || undefined,
      role: formData.get('role'),
      isActive: formData.get('isActive') === 'on',
    }

    const parsed = updateUserSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const updated = await updateUser(id, parsed.data)
    if (!updated) return { error: 'Usuário não encontrado' }

    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao atualizar usuário' }
  }
}

export async function deleteUserAction(formData: FormData) {
  try {
    await requireAdmin()

    const id = formData.get('id') as string
    if (!id) return { error: 'ID obrigatório' }

    const session = await requireAdmin()
    if (session.sub === id) {
      return { error: 'Não é possível excluir a si mesmo' }
    }

    const deleted = await deleteUser(id)
    if (!deleted) return { error: 'Usuário não encontrado' }

    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao excluir usuário' }
  }
}

export async function listUsersAction(query = '', page = 1, limit = 20) {
  try {
    await requireAdmin()
    return await listUsers(query, page, limit)
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return { users: [], total: 0, error: 'Erro ao listar usuários' }
  }
}

export async function changePasswordAction(formData: FormData) {
  try {
    const session = await requireAuth()

    const raw = {
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    }

    const parsed = changePasswordSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const result = await changePassword(session.sub, parsed.data.currentPassword, parsed.data.newPassword)
    if (!result.success) return { error: result.error }

    return { success: true }
  } catch (error) {
    console.error('Erro ao alterar senha:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao alterar senha' }
  }
}

export async function requestPasswordResetAction(_prev: unknown, formData: FormData) {
  try {
    const raw = {
      matricula: formData.get('matricula'),
    }

    const parsed = loginSchema.safeParse({ matricula: raw.matricula, password: 'dummy' })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Matrícula inválida' }
    }

    const cleanMatricula = (raw.matricula as string).trim().toUpperCase()
    const user = await findUserByMatricula(cleanMatricula)

    if (!user || !user.isActive) {
      return { error: 'Usuário não encontrado.' }
    }

    const { db } = await import('@/lib/mongodb').then(m => m.connectToDatabase())
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { resetRequested: true, updatedAt: new Date() } }
    )

    return { success: true, message: 'Solicitação de redefinição de senha enviada. Um administrador irá processá-la.' }
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error)
    return { error: 'Erro ao solicitar redefinição. Tente novamente.' }
  }
}

export async function adminClearUserPasswordAction(formData: FormData) {
  try {
    await requireAdmin()

    const id = formData.get('id') as string
    if (!id) return { error: 'ID do usuário é obrigatório.' }

    const session = await requireAdmin()
    if (session.sub === id) {
      return { error: 'Não é possível limpar a própria senha.' }
    }

    const { db } = await import('@/lib/mongodb').then(m => m.connectToDatabase())
    const result = await db.collection('users').updateOne(
      { _id: new (await import('mongodb')).ObjectId(id) },
      { $set: { passwordHash: null, primeiroAcesso: true, resetRequested: false, passwordChangedAt: new Date(), updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return { error: 'Usuário não encontrado.' }
    }

    return { success: true, message: 'Senha limpa com sucesso! O usuário definirá uma nova senha no próximo login.' }
  } catch (error) {
    console.error('Erro ao limpar senha:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao limpar senha.' }
  }
}

async function requireAuth() {
  const { getSession } = await import('@/lib/jwt')
  const session = await getSession()
  if (!session) throw new Error('Não autenticado')
  return session
}