import { api } from './api'
import type { PermissionKey } from '../types/permissions'

export interface PermissionCatalogItem {
  code?: string
  key?: string
  name?: string
  description?: string
}

export const securityApi = {
  getPermissions: (token: string) => api.get<PermissionCatalogItem[]>('/security/permissions', token),
  getPermissionsByRole: (token: string) => api.get<Record<string, PermissionKey[]>>('/security/permissions/by-role', token),
}
