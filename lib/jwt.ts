import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado')
}

const secretKey = new TextEncoder().encode(JWT_SECRET)
const ALG = 'HS256'

export interface JWTPayload {
  sub: string
  matricula: string
  nome: string
  role: 'admin' | 'user'
  purpose?: 'auth' | 'setup'
}

export async function signToken(payload: JWTPayload, expiresIn: string): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALG] })
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('viatura_session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Não autenticado')
  }
  return session
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await requireAuth()
  if (session.role !== 'admin') {
    throw new Error('Acesso negado: apenas administradores')
  }
  return session
}

export const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '7d'
export const SETUP_TOKEN_EXPIRY = process.env.SETUP_TOKEN_EXPIRES_IN || '10m'