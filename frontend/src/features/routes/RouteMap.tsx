import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Polyline } from 'leaflet'

export interface GpsPoint {
  lat: number
  lng: number
  timestamp: string
}

interface Props {
  points: GpsPoint[]
}

export function RouteMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LeafletMap | null>(null)
  const lineRef      = useRef<Polyline | null>(null)

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return

    import('leaflet').then((L) => {
      if (!containerRef.current) return

      // Limpia instancia previa si existe
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current, { zoomControl: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)

      const latlngs: [number, number][] = points.map((p) => [p.lat, p.lng])
      lineRef.current = L.polyline(latlngs, {
        color:  '#3b82f6',
        weight: 4,
        opacity: 0.85,
      }).addTo(map)

      // Marcador de inicio (verde)
      L.circleMarker(latlngs[0], {
        radius:      8,
        color:       '#fff',
        fillColor:   '#22c55e',
        fillOpacity: 1,
        weight:      2,
      })
        .bindTooltip('Inicio')
        .addTo(map)

      // Marcador de fin (rojo)
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius:      8,
        color:       '#fff',
        fillColor:   '#ef4444',
        fillOpacity: 1,
        weight:      2,
      })
        .bindTooltip('Fin')
        .addTo(map)

      map.fitBounds(lineRef.current.getBounds(), { padding: [24, 24] })
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [points])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 260, borderRadius: 8 }}
    />
  )
}
