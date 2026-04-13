import { PANIC_LABELS } from './Alert'
import type { AlertType, Alert } from './Alert'

// Todos los tipos que el sistema debe reconocer
const ALL_TYPES: AlertType[] = [
  'VEHICLE_STOPPED',
  'PANIC_ACCIDENT',
  'PANIC_ROBBERY',
  'PANIC_MEDICAL',
  'PANIC_MECHANICAL',
  'PANIC_OTHER',
]

describe('AlertType — cobertura completa de tipos', () => {

  it('PANIC_LABELS cubre todos los AlertType definidos', () => {
    for (const type of ALL_TYPES) {
      expect(PANIC_LABELS).toHaveProperty(type)
    }
  })

  it('cada etiqueta es una cadena no vacía', () => {
    for (const type of ALL_TYPES) {
      expect(typeof PANIC_LABELS[type]).toBe('string')
      expect(PANIC_LABELS[type].length).toBeGreaterThan(0)
    }
  })

  it('PANIC_LABELS no tiene tipos desconocidos fuera del contrato', () => {
    const definedKeys = Object.keys(PANIC_LABELS)
    expect(definedKeys).toHaveLength(ALL_TYPES.length)
    for (const key of definedKeys) {
      expect(ALL_TYPES).toContain(key)
    }
  })

  it('PANIC_LABELS distingue entre alertas de movimiento y de pánico', () => {
    const panicTypes = ALL_TYPES.filter((t) => t.startsWith('PANIC_'))
    expect(panicTypes).toHaveLength(5)
    expect(PANIC_LABELS['VEHICLE_STOPPED']).not.toMatch(/pánico/i)
  })
})

describe('Alert — estructura de datos', () => {

  it('una alerta válida cumple la interfaz esperada', () => {
    const alert: Alert = {
      id:         'uuid-1234',
      vehicle_id: 'truck-01',
      type:       'PANIC_ROBBERY',
      message:    'Robo / Asalto reportado',
      timestamp:   new Date('2026-04-12T10:00:00Z'),
      resolved:    false,
    }

    expect(alert.id).toBe('uuid-1234')
    expect(alert.vehicle_id).toBe('truck-01')
    expect(alert.type).toBe('PANIC_ROBBERY')
    expect(alert.resolved).toBe(false)
    expect(alert.timestamp).toBeInstanceOf(Date)
  })

  it('una alerta puede marcarse como resuelta', () => {
    const alert: Alert = {
      id:         'uuid-5678',
      vehicle_id: 'truck-02',
      type:       'VEHICLE_STOPPED',
      message:    'Sin movimiento',
      timestamp:   new Date(),
      resolved:    true,
    }

    expect(alert.resolved).toBe(true)
  })
})
