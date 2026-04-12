import https from 'https'
import http from 'http'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'
const INGEST_PATH = '/api/gps/ingest'

// ─── Rutas reales por Bogotá ──────────────────────────────────────────────────

const VEHICLES: Array<{ id: string; route: [number, number][] }> = [
  {
    id: 'SIM-truck-01',
    route: [
      [4.6097, -74.0817], [4.6112, -74.0834], [4.6128, -74.0851],
      [4.6145, -74.0868], [4.6162, -74.0885], [4.6178, -74.0901],
      [4.6195, -74.0918], [4.6211, -74.0934], [4.6228, -74.0951],
      [4.6244, -74.0967],
    ],
  },
  {
    id: 'SIM-truck-02',
    route: [
      [4.6712, -74.0534], [4.6728, -74.0551], [4.6745, -74.0568],
      [4.6761, -74.0584], [4.6778, -74.0601], [4.6794, -74.0617],
      [4.6811, -74.0634], [4.6827, -74.0650], [4.6844, -74.0667],
      [4.6860, -74.0683],
    ],
  },
  {
    id: 'SIM-truck-03',
    route: [
      [4.7110, -74.0721], [4.7095, -74.0738], [4.7080, -74.0755],
      [4.7065, -74.0772], [4.7050, -74.0789], [4.7035, -74.0806],
      [4.7020, -74.0823], [4.7005, -74.0840], [4.6990, -74.0857],
      [4.6975, -74.0874],
    ],
  },
  {
    id: 'SIM-truck-04',
    route: [
      [4.6341, -74.1123], [4.6358, -74.1107], [4.6375, -74.1091],
      [4.6392, -74.1075], [4.6409, -74.1059], [4.6426, -74.1043],
      [4.6443, -74.1027], [4.6460, -74.1011], [4.6477, -74.0995],
      [4.6494, -74.0979],
    ],
  },
  {
    id: 'SIM-truck-05',
    route: [
      [4.6532, -74.0631], [4.6548, -74.0648], [4.6564, -74.0665],
      [4.6580, -74.0682], [4.6596, -74.0699], [4.6612, -74.0716],
      [4.6628, -74.0733], [4.6644, -74.0750], [4.6660, -74.0767],
      [4.6676, -74.0784],
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shouldInject(percentage: number): boolean {
  return Math.random() < percentage / 100
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function request(
  url: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<number> {
  return new Promise((resolve) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined
    const parsedUrl = new URL(url)
    const lib = parsedUrl.protocol === 'https:' ? https : http

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port:     parsedUrl.port,
      path:     parsedUrl.pathname + parsedUrl.search,
      method,
      headers:  payload
        ? {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(payload),
          }
        : {},
    }

    const req = lib.request(options, (res) => resolve(res.statusCode ?? 0))
    req.on('error', () => resolve(0))
    if (payload) req.write(payload)
    req.end()
  })
}

const get  = (url: string) => request(url, 'GET')
const post = (url: string, body: unknown) => request(url, 'POST', body)

// ─── Lógica de envío GPS ──────────────────────────────────────────────────────

async function sendReading(
  vehicle_id: string,
  lat: number,
  lng: number,
): Promise<void> {
  const endpoint = `${BACKEND_URL}${INGEST_PATH}`
  const timestamp = new Date().toISOString()

  // 5% peticiones con formato erróneo
  if (shouldInject(5)) {
    const malformed = { vehicle_id, lat: 'NaN', lng: null }
    const status = await post(endpoint, malformed)
    console.log(`[CHAOS][malformed] ${vehicle_id} → HTTP ${status}`)
    return
  }

  const payload = { vehicle_id, lat, lng, timestamp }
  const status = await post(endpoint, payload)

  if (status === 201) {
    console.log(`[OK] ${vehicle_id} → (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
  } else if (status === 409) {
    console.log(`[DEDUP] ${vehicle_id} → duplicado rechazado`)
  } else {
    console.warn(`[WARN] ${vehicle_id} → HTTP ${status}`)
  }

  // 10% peticiones duplicadas: reenvía el mismo dato inmediatamente
  if (shouldInject(10)) {
    const dupStatus = await post(endpoint, payload)
    console.log(
      `[CHAOS][duplicate] ${vehicle_id} → HTTP ${dupStatus} (esperado 409)`,
    )
  }
}

// ─── Ciclo de viaje (un trayecto = una ruta) ──────────────────────────────────

async function runLap(
  vehicleId: string,
  route: [number, number][],
  fromIdx: number,
  toIdx: number,
): Promise<void> {
  // Notifica al backend que inicia un viaje (crea registro de ruta)
  await post(`${BACKEND_URL}/api/vehicles/${vehicleId}/start`, {})
  console.log(`[Simulator] [${vehicleId}] Viaje iniciado`)

  const step = fromIdx <= toIdx ? 1 : -1
  for (let i = fromIdx; i !== toIdx + step; i += step) {
    const [lat, lng] = route[i]
    await sendReading(vehicleId, lat, lng)
    await sleep(randomBetween(2000, 5000))
  }

  // Notifica al backend que finaliza el viaje (cierra la ruta)
  await post(`${BACKEND_URL}/api/vehicles/${vehicleId}/stop`, {})
  console.log(`[Simulator] [${vehicleId}] Viaje finalizado`)
}

// ─── Bucle principal por vehículo ────────────────────────────────────────────

async function vehicleLoop(
  vehicleId: string,
  route: [number, number][],
  startDelay: number,
): Promise<void> {
  // Pequeño retraso para que los vehículos no arranquen simultáneamente
  await sleep(startDelay)

  while (true) {
    // Trayecto de ida
    await runLap(vehicleId, route, 0, route.length - 1)
    await sleep(randomBetween(6000, 12000))

    // Trayecto de vuelta
    await runLap(vehicleId, route, route.length - 1, 0)
    await sleep(randomBetween(6000, 12000))
  }
}

// ─── Inicio ───────────────────────────────────────────────────────────────────

async function waitForBackend(retries = 20): Promise<void> {
  for (let i = 0; i < retries; i++) {
    const status = await get(`${BACKEND_URL}/health`)
    if (status === 200) {
      console.log('[Simulator] Backend is ready')
      return
    }
    console.log(`[Simulator] Waiting for backend... (${i + 1}/${retries})`)
    await sleep(3000)
  }
  throw new Error('[Simulator] Backend did not respond in time')
}

async function main(): Promise<void> {
  console.log(`[Simulator] Starting — backend: ${BACKEND_URL}`)
  console.log(
    `[Simulator] Vehicles: ${VEHICLES.length} | Chaos: 10% duplicates, 5% malformed`,
  )

  await waitForBackend()

  VEHICLES.forEach((v, i) => {
    vehicleLoop(v.id, v.route, i * 1500).catch((err) =>
      console.error(`[Simulator] Error in ${v.id}:`, err),
    )
  })
}

main().catch((err) => {
  console.error('[Simulator] Fatal error:', err)
  process.exit(1)
})
