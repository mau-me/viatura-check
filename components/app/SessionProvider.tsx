'use client'

import { AuthProvider } from './AuthContext'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}