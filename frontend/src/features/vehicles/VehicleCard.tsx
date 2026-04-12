import { useState } from 'react'
import type { Vehicle } from '../../types'
import './vehicles.css'

interface Props {
  vehicle: Vehicle
  isSelected: boolean
  onClick: () => void
  onDelete: (id: string) => void
}

const STATUS_CONFIG = {
  moving:  { label: 'En movimiento', color: 'success', icon: '🟢' },
  stopped: { label: 'Detenido',      color: 'warning', icon: '🟡' },
  alert:   { label: 'Alerta',        color: 'danger',  icon: '🔴' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function VehicleCard({ vehicle, isSelected, onClick, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const config = STATUS_CONFIG[vehicle.status]

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(true)
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(vehicle.id)
    setConfirming(false)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div
      className={`vehicle-card ${isSelected ? 'vehicle-card--selected' : ''} vehicle-card--${config.color}`}
      onClick={onClick}
    >
      <div className="vehicle-card__header">
        <span className="vehicle-card__icon">{config.icon}</span>
        <span className="vehicle-card__id">{vehicle.label}</span>
        <span className={`vehicle-card__badge vehicle-card__badge--${config.color}`}>
          {config.label}
        </span>
        {!confirming && (
          <button className="vehicle-card__delete" onClick={handleDeleteClick} title="Eliminar vehículo">
            ✕
          </button>
        )}
      </div>

      {confirming ? (
        <div className="vehicle-card__confirm">
          <span>¿Eliminar {vehicle.id}?</span>
          <div className="vehicle-card__confirm-actions">
            <button className="vehicle-card__confirm-yes" onClick={handleConfirm}>Eliminar</button>
            <button className="vehicle-card__confirm-no"  onClick={handleCancel}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="vehicle-card__meta">
          <span>{vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}</span>
          <span>{formatTime(vehicle.lastSeen)}</span>
        </div>
      )}
    </div>
  )
}
