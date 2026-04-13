/**
 * Tests del Circuit Breaker GPS
 *
 * Verificamos tres aspectos:
 *   1. La fábrica devuelve un objeto CircuitBreaker correctamente inicializado.
 *   2. El fallback devuelve { status: 'queued' } para no bloquear el ingreso de datos
 *      cuando la base de datos está caída.
 *   3. El breaker se registra globalmente y es recuperable vía getBreaker().
 */

// ── Mock de opossum ───────────────────────────────────────────────────────────
// Capturamos las opciones y el fallback registrado sin necesidad de levantar
// una instancia real (que necesitaría Redis y PostgreSQL).

let capturedOptions: Record<string, unknown> = {}
let capturedFallback: ((reading: unknown) => unknown) | null = null
const mockOn = jest.fn()

jest.mock('opossum', () => {
  return jest.fn().mockImplementation((_fn: unknown, options: Record<string, unknown>) => {
    capturedOptions = options
    return {
      on:       mockOn,
      fallback: jest.fn().mockImplementation((fb: (r: unknown) => unknown) => {
        capturedFallback = fb
      }),
    }
  })
})

// ── Módulo bajo test ──────────────────────────────────────────────────────────

import type { IngestGpsUseCase } from '../../application/ingest-gps/IngestGpsUseCase'
import type { GpsReading }       from '../../domain/entities/GpsReading'

// Reiniciamos el módulo para que el estado interno (breaker = null) parta limpio
let createGpsCircuitBreaker: (uc: IngestGpsUseCase) => unknown
let getBreaker: () => unknown

beforeAll(() => {
  jest.resetModules()
  const mod = require('./gpsCircuitBreaker')
  createGpsCircuitBreaker = mod.createGpsCircuitBreaker
  getBreaker              = mod.getBreaker
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUseCase = {
  execute: jest.fn().mockResolvedValue({ status: 'accepted' }),
} as unknown as IngestGpsUseCase

const sampleReading: GpsReading = {
  vehicle_id: 'truck-01',
  lat:         4.6097,
  lng:        -74.0817,
  timestamp:   new Date('2026-04-12T10:00:00Z'),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('gpsCircuitBreaker — inicialización', () => {

  it('getBreaker retorna null antes de crear el breaker', () => {
    expect(getBreaker()).toBeNull()
  })

  it('createGpsCircuitBreaker retorna un objeto breaker no nulo', () => {
    const breaker = createGpsCircuitBreaker(mockUseCase)
    expect(breaker).not.toBeNull()
    expect(breaker).toBeTruthy()
  })

  it('getBreaker retorna el breaker después de la inicialización', () => {
    expect(getBreaker()).not.toBeNull()
  })
})

describe('gpsCircuitBreaker — configuración de opossum', () => {

  it('usa un timeout de 3 s para que lecturas lentas no bloqueen el sistema', () => {
    expect(capturedOptions.timeout).toBe(3000)
  })

  it('abre el circuito cuando el 50 % de las llamadas fallan', () => {
    expect(capturedOptions.errorThresholdPercentage).toBe(50)
  })

  it('intenta recuperarse cada 30 s (resetTimeout)', () => {
    expect(capturedOptions.resetTimeout).toBe(30000)
  })

  it('requiere al menos 5 llamadas antes de poder abrir el circuito (volumeThreshold)', () => {
    expect(capturedOptions.volumeThreshold).toBe(5)
  })

  it('registra listeners para los eventos open, halfOpen y close', () => {
    const registeredEvents = mockOn.mock.calls.map(([event]: [string]) => event)
    expect(registeredEvents).toContain('open')
    expect(registeredEvents).toContain('halfOpen')
    expect(registeredEvents).toContain('close')
  })
})

describe('gpsCircuitBreaker — fallback de resiliencia', () => {

  it('el fallback registrado retorna { status: "queued" } cuando la DB está caída', () => {
    expect(capturedFallback).not.toBeNull()
    const result = capturedFallback!(sampleReading)
    expect(result).toEqual({ status: 'queued' })
  })

  it('el fallback acepta cualquier lectura GPS sin lanzar excepciones', () => {
    const readings: GpsReading[] = [
      { vehicle_id: 'v1', lat:  0,   lng:   0,   timestamp: new Date() },
      { vehicle_id: 'v2', lat: 90,   lng: 180,   timestamp: new Date() },
      { vehicle_id: 'v3', lat: -90,  lng: -180,  timestamp: new Date() },
    ]

    for (const r of readings) {
      expect(() => capturedFallback!(r)).not.toThrow()
      expect(capturedFallback!(r)).toEqual({ status: 'queued' })
    }
  })
})
