import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import type { GpsReading } from '../../domain/entities/GpsReading'
import type { Alert } from '../../domain/entities/Alert'
import type { VehicleStatus } from '../../domain/entities/Vehicle'

let io: SocketServer | null = null

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`)
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`)
    })
  })

  return io
}

export function emitGpsUpdate(reading: GpsReading): void {
  io?.emit('gps:update', {
    vehicle_id: reading.vehicle_id,
    lat: reading.lat,
    lng: reading.lng,
    timestamp: reading.timestamp.toISOString(),
  })
}

export function emitVehicleStatus(vehicle_id: string, status: VehicleStatus): void {
  io?.emit('vehicle:status', { vehicle_id, status })
}

export function emitAlert(alert: Alert): void {
  io?.emit('alert:new', {
    id: alert.id,
    vehicle_id: alert.vehicle_id,
    type: alert.type,
    message: alert.message,
    timestamp: alert.timestamp.toISOString(),
    resolved: false,
  })
}

export function emitVehicleDeleted(vehicle_id: string): void {
  io?.emit('vehicle:deleted', { vehicle_id })
}

export function emitAlertResolved(alert_id: string, vehicle_id: string, alert_type: string): void {
  io?.emit('alert:resolved', { alert_id, vehicle_id, alert_type })
}
