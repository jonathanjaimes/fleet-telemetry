import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'superadmin' | 'fleet' | 'driver'

export interface AuthUser {
  id: string
  unique_id: string
  role: UserRole
}

interface AuthState {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login:  (user) => set({ user }),
      logout: ()     => set({ user: null }),
    }),
    { name: 'fleet-auth' }
  )
)
