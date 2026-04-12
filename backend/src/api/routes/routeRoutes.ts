import { Router } from 'express'
import type { Request, Response } from 'express'
import { PgRouteRepository } from '../../infrastructure/db/PgRouteRepository'

export const routeRouter = Router()

const routeRepo = new PgRouteRepository()

function durationSeconds(started_at: Date, ended_at: Date | null): number | null {
  if (!ended_at) return null
  return Math.floor((ended_at.getTime() - started_at.getTime()) / 1000)
}

// GET /api/routes?vehicle_id=xxx
routeRouter.get('/', async (req: Request, res: Response) => {
  const vehicle_id = req.query.vehicle_id as string
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id requerido' })

  try {
    const routes = await routeRepo.findByVehicle(vehicle_id)
    res.json(
      routes.map((r) => ({
        id:          r.id,
        vehicle_id:  r.vehicle_id,
        started_at:  r.started_at.toISOString(),
        ended_at:    r.ended_at?.toISOString() ?? null,
        duration_s:  durationSeconds(r.started_at, r.ended_at),
        active:      !r.ended_at,
      })),
    )
  } catch (err) {
    console.error('[Routes] Error fetching routes:', err)
    res.status(500).json({ error: 'Error al obtener rutas' })
  }
})

// GET /api/routes/:route_id/points
routeRouter.get('/:route_id/points', async (req: Request, res: Response) => {
  const { route_id } = req.params

  try {
    const route = await routeRepo.findById(route_id)
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada' })

    const points = await routeRepo.getPoints(
      route.vehicle_id,
      route.started_at,
      route.ended_at,
    )
    res.json(points)
  } catch (err) {
    console.error('[Routes] Error fetching points:', err)
    res.status(500).json({ error: 'Error al obtener puntos de ruta' })
  }
})
