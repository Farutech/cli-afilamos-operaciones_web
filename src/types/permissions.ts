export type PermissionKey = string

export interface PermissionSet {
  roles: string[]
  permissions: PermissionKey[]
}

export const PERMISSIONS = {
  ADMIN: 'admin',
  CASHIER: 'cashier',
  CASH_MANAGE: 'cash.manage',
  APPROVALS_READ: 'approvals.read',
  APPROVALS_APPROVE: 'approvals.approve',
} as const

export function hasPermission(session: PermissionSet | undefined, permission: string): boolean {
  if (!session) return false
  return session.roles.some((role) => role.toLowerCase().includes('admin')) || session.permissions.includes(permission)
}

export function isCashier(session: PermissionSet | undefined): boolean {
  if (!session) return false
  return session.roles.some((role) => /caj|cashier/i.test(role)) || session.permissions.some((permission) => /caj|cash/i.test(permission))
}

export function canApprove(session: PermissionSet | undefined): boolean {
  return hasPermission(session, PERMISSIONS.APPROVALS_APPROVE)
}

export function normalizePermissionList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function normalizeRoles(value: unknown): string[] {
  return normalizePermissionList(value)
}

export function primaryRole(roles: string[]): 'Administrador' | 'Cajero' | 'Operario' | 'Auditor' {
  const role = roles[0]?.toUpperCase() ?? ''
  if (role.includes('ADMIN')) return 'Administrador'
  if (role.includes('CAJ') || role.includes('CASH')) return 'Cajero'
  if (role.includes('AUDIT')) return 'Auditor'
  return 'Operario'
}
