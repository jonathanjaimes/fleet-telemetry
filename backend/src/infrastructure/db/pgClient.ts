import { Pool } from 'pg'

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
      timestamp   TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gps_vehicle_time
      ON gps_readings(vehicle_id, timestamp DESC);
  `)
}
