export type UserRole = 'superadmin' | 'fleet' | 'driver'

export interface User {
  id: string           // UUID interno
  unique_id: string    // Código legible: SUPER-001, FLT-XXXXX, DRV-XXXXX
  role: UserRole
  created_by: string | null
  created_at: Date
}
