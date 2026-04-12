import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { PgUserRepository } from '../../infrastructure/db/PgUserRepository'

export const userRouter = Router()
const userRepo = new PgUserRepository()

function randomCode(length = 5): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Middleware: verifica que el header x-user-id tenga el rol requerido
async function requireRole(req: Request, res: Response, roles: string[]): Promise<boolean> {
  const callerId = req.headers['x-user-id'] as string
  if (!callerId) { res.status(401).json({ error: 'No autenticado' }); return false }
  const caller = await userRepo.findByUniqueId(callerId)
  if (!caller || !roles.includes(caller.role)) {
    res.status(403).json({ error: 'Sin permisos' }); return false
  }
  return true
}

// SUPERADMIN: listar y crear usuarios flota
userRouter.get('/fleet', async (req: Request, res: Response) => {
  if (!await requireRole(req, res, ['superadmin'])) return
  const users = await userRepo.findByRole('fleet')
  res.json(users)
})

userRouter.post('/fleet', async (req: Request, res: Response) => {
  if (!await requireRole(req, res, ['superadmin'])) return
  const callerId = (req.headers['x-user-id'] as string).toUpperCase()
  const caller   = await userRepo.findByUniqueId(callerId)

  let unique_id: string
  let attempts = 0
  do {
    unique_id = `FLT-${randomCode()}`
    attempts++
  } while (await userRepo.exists(unique_id) && attempts < 10)

  const user = await userRepo.create({
    id:         uuidv4(),
    unique_id,
    role:       'fleet',
    created_by: caller!.id,
  })
  res.status(201).json(user)
})

// SUPERADMIN: eliminar usuario flota
userRouter.delete('/fleet/:id', async (req: Request, res: Response) => {
  if (!await requireRole(req, res, ['superadmin'])) return
  const target = await userRepo.findByUniqueId(req.params.id)
  if (!target || target.role !== 'fleet') {
    res.status(404).json({ error: 'Usuario flota no encontrado' })
    return
  }
  await userRepo.delete(target.id)
  res.json({ message: 'Usuario flota eliminado' })
})

// FLEET: listar y crear usuarios conductor (drivers)
userRouter.get('/drivers', async (req: Request, res: Response) => {
  if (!await requireRole(req, res, ['fleet'])) return
  const callerId = (req.headers['x-user-id'] as string).toUpperCase()
  const caller   = await userRepo.findByUniqueId(callerId)
  const drivers  = await userRepo.findByCreator(caller!.id)
  res.json(drivers)
})

userRouter.post('/drivers', async (req: Request, res: Response) => {
  if (!await requireRole(req, res, ['fleet'])) return
  const callerId = (req.headers['x-user-id'] as string).toUpperCase()
  const caller   = await userRepo.findByUniqueId(callerId)

  let unique_id: string
  let attempts = 0
  do {
    unique_id = `DRV-${randomCode()}`
    attempts++
  } while (await userRepo.exists(unique_id) && attempts < 10)

  const user = await userRepo.create({
    id:         uuidv4(),
    unique_id,
    role:       'driver',
    created_by: caller!.id,
  })
  res.status(201).json(user)
})

// FLEET: eliminar conductor
userRouter.delete('/drivers/:id', async (req: Request, res: Response) => {
  if (!await requireRole(req, res, ['fleet'])) return
  const callerId = (req.headers['x-user-id'] as string).toUpperCase()
  const caller   = await userRepo.findByUniqueId(callerId)
  const target   = await userRepo.findByUniqueId(req.params.id)
  if (!target || target.role !== 'driver' || target.created_by !== caller!.id) {
    res.status(404).json({ error: 'Conductor no encontrado o sin permisos' })
    return
  }
  await userRepo.delete(target.id)
  res.json({ message: 'Conductor eliminado' })
})
