import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'
import { signToken, verifyToken, getSession, requireAuth, requireAdmin, TOKEN_EXPIRY, SETUP_TOKEN_EXPIRY, type JWTPayload } from '@/lib/jwt'
import { cookies } from 'next/headers'

const BCRYPT_COST = 12
const SESSION_COOKIE = 'viatura_session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function setSessionCookie(payload: JWTPayload, expiresIn: string): Promise<void> {
  const token = await signToken(payload, expiresIn)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn === '7d' ? 60 * 60 * 24 * 7 : 60 * 10,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export { getSession, requireAuth, requireAdmin, verifyToken, TOKEN_EXPIRY, SETUP_TOKEN_EXPIRY }

export interface UserDoc {
  _id: ObjectId
  matricula: string
  nome: string
  patente: string
  email?: string
  role: 'admin' | 'user'
  passwordHash: string | null
  isActive: boolean
  primeiroAcesso: boolean
  resetRequested: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  passwordChangedAt?: Date
}

export interface UserPublic {
  _id: string
  matricula: string
  nome: string
  patente: string
  email?: string
  role: 'admin' | 'user'
  isActive: boolean
  primeiroAcesso: boolean
  resetRequested: boolean
  createdAt: Date
  lastLoginAt?: Date
}

function toPublic(doc: UserDoc): UserPublic {
  return {
    _id: doc._id.toString(),
    matricula: doc.matricula,
    nome: doc.nome,
    patente: doc.patente,
    email: doc.email,
    role: doc.role,
    isActive: doc.isActive,
    primeiroAcesso: doc.primeiroAcesso,
    resetRequested: doc.resetRequested,
    createdAt: doc.createdAt,
    lastLoginAt: doc.lastLoginAt,
  }
}

export async function findUserByMatricula(matricula: string): Promise<UserDoc | null> {
  const { db } = await connectToDatabase()
  return db.collection<UserDoc>('users').findOne({ matricula })
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null
  const { db } = await connectToDatabase()
  return db.collection<UserDoc>('users').findOne({ _id: new ObjectId(id) })
}

export async function createUser(data: {
  matricula: string
  nome: string
  patente: string
  email?: string
  role: 'admin' | 'user'
  isActive?: boolean
}): Promise<UserPublic> {
  const { db } = await connectToDatabase()
  const now = new Date()
  const doc: Omit<UserDoc, '_id'> = {
    matricula: data.matricula.trim().toUpperCase(),
    nome: data.nome.trim(),
    patente: data.patente.trim().toUpperCase(),
    email: data.email?.trim().toLowerCase() || undefined,
    role: data.role,
    passwordHash: null,
    isActive: data.isActive ?? true,
    primeiroAcesso: true,
    resetRequested: false,
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection('users').insertOne(doc)
  return toPublic({ ...doc, _id: result.insertedId })
}

export async function updateUser(id: string, data: Partial<Omit<UserDoc, '_id' | 'matricula' | 'createdAt'>>): Promise<UserPublic | null> {
  if (!ObjectId.isValid(id)) return null
  const { db } = await connectToDatabase()
  const update = { ...data, updatedAt: new Date() }
  const result = await db.collection<UserDoc>('users').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: 'after' }
  )
  return result ? toPublic(result) : null
}

export async function deleteUser(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false
  const { db } = await connectToDatabase()
  const result = await db.collection<UserDoc>('users').deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount === 1
}

export async function listUsers(query = '', page = 1, limit = 20): Promise<{ users: UserPublic[]; total: number }> {
  const { db } = await connectToDatabase()
  const filter = query
    ? {
        $or: [
          { matricula: { $regex: query, $options: 'i' } },
          { nome: { $regex: query, $options: 'i' } },
          { patente: { $regex: query, $options: 'i' } },
        ],
      }
    : {}
  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    db.collection<UserDoc>('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<UserDoc>('users').countDocuments(filter),
  ])
  return { users: users.map(toPublic), total }
}

export async function setUserPassword(userId: string, passwordHash: string): Promise<void> {
  if (!ObjectId.isValid(userId)) throw new Error('ID inválido')
  const { db } = await connectToDatabase()
  await db.collection<UserDoc>('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { passwordHash, primeiroAcesso: false, passwordChangedAt: new Date(), updatedAt: new Date() } }
  )
}

export async function updateLastLogin(userId: string): Promise<void> {
  if (!ObjectId.isValid(userId)) return
  const { db } = await connectToDatabase()
  await db.collection<UserDoc>('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  )
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const user = await findUserById(userId)
  if (!user) return { success: false, error: 'Usuário não encontrado' }
  if (!user.passwordHash) return { success: false, error: 'Senha não definida' }
  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) return { success: false, error: 'Senha atual incorreta' }
  const newHash = await hashPassword(newPassword)
  await setUserPassword(userId, newHash)
  return { success: true }
}