import { pgPool } from './pgClient'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { User, UserRole } from '../../domain/entities/User'

function rowToUser(row: Record<string, unknown>): User {
  return {
    id:         row.id as string,
    unique_id:  row.unique_id as string,
    role:       row.role as UserRole,
    created_by: row.created_by as string | null,
    created_at: new Date(row.created_at as string),
  }
}

export class PgUserRepository implements IUserRepository {
  async findByUniqueId(unique_id: string): Promise<User | null> {
    const res = await pgPool.query('SELECT * FROM users WHERE unique_id = $1', [unique_id])
    return res.rows[0] ? rowToUser(res.rows[0]) : null
  }

  async findById(id: string): Promise<User | null> {
    const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [id])
    return res.rows[0] ? rowToUser(res.rows[0]) : null
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const res = await pgPool.query('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', [role])
    return res.rows.map(rowToUser)
  }

  async findByCreator(creator_id: string): Promise<User[]> {
    const res = await pgPool.query('SELECT * FROM users WHERE created_by = $1 ORDER BY created_at DESC', [creator_id])
    return res.rows.map(rowToUser)
  }

  async create(user: Omit<User, 'created_at'>): Promise<User> {
    const res = await pgPool.query(
      `INSERT INTO users (id, unique_id, role, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, user.unique_id, user.role, user.created_by]
    )
    return rowToUser(res.rows[0])
  }

  async exists(unique_id: string): Promise<boolean> {
    const res = await pgPool.query('SELECT 1 FROM users WHERE unique_id = $1', [unique_id])
    return res.rows.length > 0
  }
}
