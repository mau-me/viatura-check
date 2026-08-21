import { NextResponse } from 'next/server'
import { getSession } from '@/lib/jwt'
import { findUserById } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const user = await findUserById(session.sub)
    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        matricula: user.matricula,
        nome: user.nome,
        patente: user.patente,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        primeiroAcesso: user.primeiroAcesso,
        resetRequested: user.resetRequested,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
      },
    })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}