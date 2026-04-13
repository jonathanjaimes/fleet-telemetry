import { useState, useEffect } from 'react'
import type { Vehicle } from '../../types'
import { ALERT_CONFIG } from '../../types'
import './vehicles.css'

interface Props {
  vehicle: Vehicle
  isSelected: boolean
  onClick: () => void
  onDelete: (id: string) => void
}

const STATUS_CONFIG = {
  moving:  { label: 'En movimiento',          color: 'success' },
  idle:    { label: 'Inactivo',               color: 'idle'    },
  stopped: { label: 'Detenido por conductor', color: 'warning' },
  alert:   { label: 'Alerta',                color: 'danger'  },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function VehicleCard({ vehicle, isSelected, onClick, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  // Inicializar con Date.now como función para que React lo llame una sola vez,
  // evitando llamadas impuras durante el render.
  const [now, setNow] = useState(Date.now)
  const config = STATUS_CONFIG[vehicle.status]

  const showAlertChip =
    vehicle.lastAlertType &&
    vehicle.alertChipExpiry &&
    now < vehicle.alertChipExpiry

  useEffect(() => {
    if (!vehicle.alertChipExpiry) return
    const remaining = vehicle.alertChipExpiry - Date.now()
    if (remaining <= 0) return
    const timer = setTimeout(() => setNow(Date.now()), remaining)
    return () => clearTimeout(timer)
  }, [vehicle.alertChipExpiry])

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
        <span className={`vehicle-card__dot vehicle-card__dot--${config.color}`} />
        <span className="vehicle-card__id">{vehicle.label}</span>
        {!confirming && (
          <button className="vehicle-card__delete" onClick={handleDeleteClick} title="Eliminar vehículo">
            ✕
          </button>
        )}
      </div>
      {!confirming && (
        <span className={`vehicle-card__status vehicle-card__badge--${config.color}`}>
          {config.label}
        </span>
      )}

      {confirming ? (
        <div className="vehicle-card__confirm">
          <span>¿Eliminar {vehicle.id}?</span>
          <div className="vehicle-card__confirm-actions">
            <button className="vehicle-card__confirm-yes" onClick={handleConfirm}>Eliminar</button>
            <button className="vehicle-card__confirm-no"  onClick={handleCancel}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          {showAlertChip && vehicle.lastAlertType && (
            <div className="vehicle-card__alert-type">
              {ALERT_CONFIG[vehicle.lastAlertType].icon}{' '}
              {ALERT_CONFIG[vehicle.lastAlertType].label}
            </div>
          )}
          <div className="vehicle-card__meta">
            <span>{vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}</span>
            <span>{formatTime(vehicle.lastSeen)}</span>
          </div>
        </>
      )}
    </div>
  )
}
