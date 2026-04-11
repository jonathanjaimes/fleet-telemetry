import CircuitBreaker from 'opossum'
import type { GpsReading } from '../../domain/entities/GpsReading'
import type { IngestGpsUseCase } from '../../application/ingest-gps/IngestGpsUseCase'

const BREAKER_OPTIONS = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
}

let breaker: CircuitBreaker | null = null

export function createGpsCircuitBreaker(useCase: IngestGpsUseCase): CircuitBreaker {
  breaker = new CircuitBreaker(
    (reading: GpsReading) => useCase.execute(reading),
    BREAKER_OPTIONS
  )

  breaker.on('open',     () => console.warn('[CircuitBreaker] OPEN — DB may be down'))
  breaker.on('halfOpen', () => console.info('[CircuitBreaker] HALF-OPEN — retrying'))
  breaker.on('close',    () => console.info('[CircuitBreaker] CLOSED — back to normal'))

  breaker.fallback((reading: GpsReading) => {
    console.warn(`[CircuitBreaker] Fallback for vehicle ${reading.vehicle_id}`)
    return { status: 'queued' }
  })

  return breaker
}

export function getBreaker(): CircuitBreaker | null {
  return breaker
}
