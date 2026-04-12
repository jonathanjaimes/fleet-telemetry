import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useFleetStore } from '../../store/useFleetStore'
import type { Vehicle } from '../../types'
import './map.css'

const DEFAULT_CENTER: [number, number] = [4.7110, -74.0721]
const DEFAULT_ZOOM = 13

const STATUS_COLORS: Record<Vehicle['status'], string> = {
  moving:  '#22c55e',
  stopped: '#f59e0b',
  alert:   '#ef4444',
}

function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 14px; height: 14px;
        background: ${color};
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 6px ${color}99;
      "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

export function FleetMap() {
  const mapRef       = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef   = useRef<Record<string, L.Marker>>({})
  const polylinesRef = useRef<Record<string, L.Polyline>>({})

  // Controla si el seguimiento automático está activo
  const [isFollowing, setIsFollowing] = useState(false)

  const vehicles      = useFleetStore((s) => s.vehicles)
  const selectedId    = useFleetStore((s) => s.selectedVehicleId)
  const selectVehicle = useFleetStore((s) => s.selectVehicle)

  // Inicializar el mapa una sola vez
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    mapRef.current = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)

    // Cuando el usuario interactúa con el mapa (zoom, drag) → pausar seguimiento
    const pauseFollow = () => setIsFollowing(false)
    mapRef.current.on('zoomstart', pauseFollow)
    mapRef.current.on('dragstart', pauseFollow)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Cuando se selecciona un vehículo → activar seguimiento automáticamente
  useEffect(() => {
    if (selectedId) setIsFollowing(true)
    else setIsFollowing(false)
  }, [selectedId])

  // Actualizar marcadores y rutas cuando cambian los vehículos
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.values(vehicles).forEach((vehicle) => {
      const color    = STATUS_COLORS[vehicle.status]
      const position: [number, number] = [vehicle.lat, vehicle.lng]

      if (markersRef.current[vehicle.id]) {
        markersRef.current[vehicle.id]
          .setLatLng(position)
          .setIcon(createMarkerIcon(color))
      } else {
        const marker = L.marker(position, { icon: createMarkerIcon(color) })
          .addTo(map)
          .bindTooltip(vehicle.label, { permanent: false, direction: 'top' })
          .on('click', () => selectVehicle(vehicle.id))
        markersRef.current[vehicle.id] = marker
      }

      if (polylinesRef.current[vehicle.id]) {
        polylinesRef.current[vehicle.id].setLatLngs(vehicle.route)
      } else {
        const polyline = L.polyline(vehicle.route, { color, weight: 2, opacity: 0.6 }).addTo(map)
        polylinesRef.current[vehicle.id] = polyline
      }

      polylinesRef.current[vehicle.id].setStyle({ color })
    })
  }, [vehicles, selectVehicle])

  // Seguir al vehículo seleccionado solo si el seguimiento está activo
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId || !isFollowing) return
    const vehicle = vehicles[selectedId]
    if (vehicle) {
      map.setView([vehicle.lat, vehicle.lng], map.getZoom(), { animate: true })
    }
  }, [selectedId, vehicles, isFollowing])

  const handleResumeFollow = useCallback(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const vehicle = vehicles[selectedId]
    if (vehicle) {
      map.flyTo([vehicle.lat, vehicle.lng], 15, { duration: 0.8 })
      setIsFollowing(true)
    }
  }, [selectedId, vehicles])

  return (
    <div className="fleet-map-wrapper">
      <div ref={containerRef} className="fleet-map" />

      {selectedId && !isFollowing && (
        <button className="follow-btn" onClick={handleResumeFollow}>
          🎯 Seguir vehículo
        </button>
      )}

      {selectedId && isFollowing && (
        <div className="follow-indicator">
          📍 Siguiendo {selectedId}
        </div>
      )}
    </div>
  )
}
