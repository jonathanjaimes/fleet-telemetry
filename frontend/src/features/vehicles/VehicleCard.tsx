import type { Vehicle } from '../../types'
import './vehicles.css'

interface Props {
  vehicle: Vehicle
  isSelected: boolean
  onClick: () => void
}

const STATUS_CONFIG = {
  moving:  { label: 'En movimiento', color: 'success', icon: '🟢' },
  stopped: { label: 'Detenido',      color: 'warning', icon: '🟡' },
  alert:   { label: 'Alerta',        color: 'danger',  icon: '🔴' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function VehicleCard({ vehicle, isSelected, onClick }: Props) {
  const config = STATUS_CONFIG[vehicle.status]

  return (
    <button
      className={`vehicle-card ${isSelected ? 'vehicle-card--selected' : ''} vehicle-card--${config.color}`}
      onClick={onClick}
    >
      <div className="vehicle-card__header">
        <span className="vehicle-card__icon">{config.icon}</span>
        <span className="vehicle-card__id">{vehicle.label}</span>
        <span className={`vehicle-card__badge vehicle-card__badge--${config.color}`}>
          {config.label}
        </span>
      </div>
      <div className="vehicle-card__meta">
        <span>{vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}</span>
        <span>{formatTime(vehicle.lastSeen)}</span>
      </div>
    </button>
  )
}
