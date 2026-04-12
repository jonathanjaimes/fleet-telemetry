import { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin, RefreshCw, X, ChevronRight } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { RouteMap } from './RouteMap'
import type { GpsPoint } from './RouteMap'
import 'leaflet/dist/leaflet.css'
import './routes.css'

const BACKEND = 'http://localhost:3001'

interface RouteRecord {
  id:         string
  vehicle_id: string
  started_at: string
  ended_at:   string | null
  duration_s: number | null
  active:     boolean
}

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`
  const m   = Math.floor(s / 60)
  const sec = s % 60
  if (m < 60) return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  const h   = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function RoutesTab() {
  const vehicles    = useFleetStore((s) => s.vehicles)
  const vehicleList = Object.values(vehicles)

  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [routes, setRoutes]                   = useState<RouteRecord[]>([])
  const [loading, setLoading]                 = useState(false)

  const [modalRoute, setModalRoute]   = useState<RouteRecord | null>(null)
  const [points, setPoints]           = useState<GpsPoint[]>([])
  const [loadingPts, setLoadingPts]   = useState(false)

  const fetchRoutes = useCallback(async (vehicleId: string) => {
    if (!vehicleId) { setRoutes([]); return }
    setLoading(true)
    try {
      const r   = await fetch(`${BACKEND}/api/routes?vehicle_id=${vehicleId}`)
      const data = await r.json()
      setRoutes(Array.isArray(data) ? data : [])
    } catch {
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoutes(selectedVehicle)
  }, [selectedVehicle, fetchRoutes])

  const openModal = async (route: RouteRecord) => {
    setModalRoute(route)
    setPoints([])
    setLoadingPts(true)
    try {
      const r    = await fetch(`${BACKEND}/api/routes/${route.id}/points`)
      const data = await r.json()
      setPoints(Array.isArray(data) ? data : [])
    } catch {
      setPoints([])
    } finally {
      setLoadingPts(false)
    }
  }

  return (
    <div className="routes-tab">
      {/* Selector de vehículo */}
      <div className="routes-tab__controls">
        <select
          className="routes-vehicle-select"
          value={selectedVehicle}
          onChange={(e) => {
            setSelectedVehicle(e.target.value)
            setModalRoute(null)
          }}
        >
          <option value="">Seleccionar vehículo...</option>
          {vehicleList.map((v) => (
            <option key={v.id} value={v.id}>{v.id}</option>
          ))}
        </select>
        {selectedVehicle && (
          <button
            className="routes-refresh-btn"
            onClick={() => fetchRoutes(selectedVehicle)}
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      {/* Contenido */}
      {!selectedVehicle ? (
        <p className="vehicle-panel__empty vehicle-panel__empty--sm routes-tab__hint">
          Selecciona un vehículo para ver su historial de rutas
        </p>
      ) : loading ? (
        <p className="vehicle-panel__empty vehicle-panel__empty--sm">Cargando rutas...</p>
      ) : routes.length === 0 ? (
        <p className="vehicle-panel__empty vehicle-panel__empty--sm">Sin rutas registradas</p>
      ) : (
        <ul className="routes-list">
          {routes.map((route) => (
            <li
              key={route.id}
              className={`route-item ${modalRoute?.id === route.id ? 'route-item--selected' : ''}`}
              onClick={() => openModal(route)}
            >
              <div className="route-item__top">
                <span className={`route-item__status ${route.active ? 'route-item__status--active' : ''}`}>
                  {route.active ? 'En curso' : 'Completado'}
                </span>
                {route.duration_s !== null && (
                  <span className="route-item__duration">
                    <Clock size={10} /> {formatDuration(route.duration_s)}
                  </span>
                )}
                <ChevronRight size={13} className="route-item__chevron" />
              </div>
              <div className="route-item__times">
                <div className="route-item__time-row">
                  <span className="route-item__label">Inicio</span>
                  <span>{formatDate(route.started_at)}</span>
                </div>
                {route.ended_at && (
                  <div className="route-item__time-row">
                    <span className="route-item__label">Fin</span>
                    <span>{formatDate(route.ended_at)}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal del mapa de la ruta */}
      {modalRoute && (
        <div className="route-modal-overlay" onClick={() => setModalRoute(null)}>
          <div className="route-modal" onClick={(e) => e.stopPropagation()}>
            <div className="route-modal__header">
              <MapPin size={14} />
              <span className="route-modal__title">
                {modalRoute.vehicle_id}
                <span className={`route-modal__badge ${modalRoute.active ? 'route-modal__badge--active' : ''}`}>
                  {modalRoute.active ? 'En curso' : 'Completado'}
                </span>
              </span>
              <button className="route-modal__close" onClick={() => setModalRoute(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="route-modal__map">
              {loadingPts ? (
                <div className="route-modal__placeholder">Cargando puntos GPS...</div>
              ) : points.length === 0 ? (
                <div className="route-modal__placeholder">Sin datos GPS registrados para esta ruta</div>
              ) : (
                <RouteMap points={points} />
              )}
            </div>

            <div className="route-modal__meta">
              <Clock size={11} />
              <span>Inicio: {formatDate(modalRoute.started_at)}</span>
              {modalRoute.ended_at && (
                <span>· Fin: {formatDate(modalRoute.ended_at)}</span>
              )}
              {modalRoute.duration_s !== null && (
                <span>· {formatDuration(modalRoute.duration_s)}</span>
              )}
              <span>· {points.length} pts GPS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
