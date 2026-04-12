import type { Route } from '../entities/Route'

export interface GpsPoint {
  lat: number
  lng: number
  timestamp: string
}

export interface IRouteRepository {
  startRoute(vehicle_id: string): Promise<Route>
  endRoute(vehicle_id: string): Promise<void>
  findByVehicle(vehicle_id: string): Promise<Route[]>
  findById(id: string): Promise<Route | null>
  getPoints(vehicle_id: string, started_at: Date, ended_at: Date | null): Promise<GpsPoint[]>
}
