import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'

export const pgPool = new Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME     ?? 'fleet_telemetry',
  user:     process.env.DB_USER     ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
})

export async function runMigrations(): Promise<void> {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS gps_readings (
      id          SERIAL PRIMARY KEY,
      vehicle_id  VARCHAR(100) NOT NULL,
      lat         DOUBLE PRECISION NOT NULL,
      lng         DOUBLE PRECISION NOT NULL,
      timestamp   TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id          VARCHAR(100) PRIMARY KEY,
      status      VARCHAR(20) NOT NULL DEFAULT 'moving',
      lat         DOUBLE PRECISION NOT NULL,
      lng         DOUBLE PRECISION NOT NULL,
      last_seen   TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id          UUID PRIMARY KEY,
      vehicle_id  VARCHAR(100) NOT NULL,
      type        VARCHAR(50) NOT NULL,
      message     TEXT NOT NULL,
      timestamp   TIMESTAMPTZ NOT NULL,
      resolved    BOOLEAN NOT NULL DEFAULT FALSE
    );

    ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE INDEX IF NOT EXISTS idx_gps_vehicle_time
      ON gps_readings(vehicle_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY,
      unique_id   VARCHAR(30) UNIQUE NOT NULL,
      role        VARCHAR(20) NOT NULL,
      created_by  UUID REFERENCES users(id),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS routes (
      id          UUID PRIMARY KEY,
      vehicle_id  VARCHAR(100) NOT NULL,
      started_at  TIMESTAMPTZ NOT NULL,
      ended_at    TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_routes_vehicle
      ON routes(vehicle_id, started_at DESC);
  `)

  // Seed superadmin si no existe
  const existing = await pgPool.query("SELECT 1 FROM users WHERE role = 'superadmin'")
  if (existing.rows.length === 0) {
    await pgPool.query(
      `INSERT INTO users (id, unique_id, role, created_by)
       VALUES ($1, 'SUPER-001', 'superadmin', NULL)`,
      [uuidv4()]
    )
    console.log('[DB] Superadmin creado — unique_id: SUPER-001')
  }
}
