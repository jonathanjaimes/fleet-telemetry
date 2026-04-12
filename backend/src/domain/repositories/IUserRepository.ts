import type { User, UserRole } from '../entities/User'

export interface IUserRepository {
  findByUniqueId(unique_id: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  findByRole(role: UserRole): Promise<User[]>
  findByCreator(creator_id: string): Promise<User[]>
  create(user: Omit<User, 'created_at'>): Promise<User>
  exists(unique_id: string): Promise<boolean>
}
