import { Router } from 'express'
import type { Request, Response } from 'express'
import { PgUserRepository } from '../../infrastructure/db/PgUserRepository'

export const authRouter = Router()
const userRepo = new PgUserRepository()

// Login: solo requiere el unique_id
authRouter.post('/login', async (req: Request, res: Response) => {
  const { unique_id } = req.body
  if (!unique_id || typeof unique_id !== 'string') {
    res.status(400).json({ error: 'unique_id requerido' })
    return
  }

  const user = await userRepo.findByUniqueId(unique_id.trim().toUpperCase())
  if (!user) {
    res.status(401).json({ error: 'ID no reconocido' })
    return
  }

  res.json({
    id:        user.id,
    unique_id: user.unique_id,
    role:      user.role,
  })
})
