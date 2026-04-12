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
  idle:    '#60a5fa',
  stopped: '#f59e0b',
  alert:   '#ef4444',
}

const STATUS_LABELS: Record<Vehicle['status'], string> = {
  moving:  '🟢 En movimiento',
  idle:    '🔵 Inactivo',
  stopped: '🟡 Detenido por conductor',
  alert:   '🔴 Alerta',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function buildPopupHtml(vehicle: Vehicle): string {
  const color = STATUS_COLORS[vehicle.status]
  return `
    <div class="vehicle-popup">
      <div class="vehicle-popup__header" style="border-left: 3px solid ${color}">
        <span class="vehicle-popup__id">${vehicle.id}</span>
        <span class="vehicle-popup__status">${STATUS_LABELS[vehicle.status]}</span>
      </div>
      <div class="vehicle-popup__row">
        <span class="vehicle-popup__label">Latitud</span>
        <span class="vehicle-popup__value">${vehicle.lat.toFixed(6)}</span>
      </div>
      <div class="vehicle-popup__row">
        <span class="vehicle-popup__label">Longitud</span>
        <span class="vehicle-popup__value">${vehicle.lng.toFixed(6)}</span>
      </div>
      <div class="vehicle-popup__row">
        <span class="vehicle-popup__label">Última señal</span>
        <span class="vehicle-popup__value">${formatTime(vehicle.lastSeen)}</span>
      </div>
      <div class="vehicle-popup__row">
        <span class="vehicle-popup__label">Puntos de ruta</span>
        <span class="vehicle-popup__value">${vehicle.route.length}</span>
      </div>
    </div>
  `
}

function createMarkerIcon(color: string, selected = false): L.DivIcon {
  if (selected) {
    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 28px; height: 28px;
            background: ${color}33;
            border: 2px solid ${color};
            border-radius: 50%;
            animation: pulse-ring 1.2s ease-out infinite;
          "></div>
          <div style="
            width: 16px; height: 16px;
            background: ${color};
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 10px ${color}, 0 0 20px ${color}88;
            position: relative;
            z-index: 1;
          "></div>
        </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  }

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

  const [isFollowing, setIsFollowing] = useState(false)

  const vehicles      = useFleetStore((s) => s.vehicles)
  const selectedId    = useFleetStore((s) => s.selectedVehicleId)
  const selectVehicle = useFleetStore((s) => s.selectVehicle)

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

    const pauseFollow = () => setIsFollowing(false)
    mapRef.current.on('zoomstart', pauseFollow)
    mapRef.current.on('dragstart', pauseFollow)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (selectedId) setIsFollowing(true)
    else setIsFollowing(false)
  }, [selectedId])

  // Actualizar marcadores, popups y rutas
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.values(vehicles).forEach((vehicle) => {
      const color      = STATUS_COLORS[vehicle.status]
      const isSelected = vehicle.id === selectedId
      const position: [number, number] = [vehicle.lat, vehicle.lng]
      const popupHtml  = buildPopupHtml(vehicle)

      if (markersRef.current[vehicle.id]) {
        const marker = markersRef.current[vehicle.id]
        marker.setLatLng(position).setIcon(createMarkerIcon(color, isSelected))
        // Actualizar contenido del popup si está abierto
        if (marker.isPopupOpen()) marker.setPopupContent(popupHtml)
        else marker.bindPopup(popupHtml, { className: 'vehicle-popup-container', maxWidth: 260 })
      } else {
        const marker = L.marker(position, { icon: createMarkerIcon(color, isSelected) })
          .addTo(map)
          .bindPopup(popupHtml, { className: 'vehicle-popup-container', maxWidth: 260 })
          .on('click', () => {
            selectVehicle(vehicle.id)
            marker.openPopup()
          })

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
  }, [vehicles, selectedId, selectVehicle])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId || !isFollowing) return
    const vehicle = vehicles[selectedId]
    if (vehicle) map.setView([vehicle.lat, vehicle.lng], map.getZoom(), { animate: true })
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
          🎯 Seguir {selectedId}
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
