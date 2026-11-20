export const ROLES = ['root', 'admin', 'user'] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  root: 'Root',
  admin: 'Admin',
  user: 'Usuário',
}

export function isStaff(role: Role | string | null | undefined): boolean {
  return role === 'root' || role === 'admin'
}

export function isRoot(role: Role | string | null | undefined): boolean {
  return role === 'root'
}
