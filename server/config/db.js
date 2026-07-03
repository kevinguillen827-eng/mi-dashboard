// ------------------------------------------------------------------
// Conexión a PostgreSQL. Este backend es OPCIONAL: se usa solo si
// quieres reportes agregados server-side, exportaciones pesadas o
// integraciones que no conviene resolver desde el cliente. La app
// principal (auth + CRUD de operaciones en tiempo real) funciona
// completamente con Firebase sin necesitar este servidor.
// ------------------------------------------------------------------
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Esquema sugerido (ejecutar una vez contra tu base de datos):
//
// CREATE TABLE IF NOT EXISTS operations_archive (
//   id SERIAL PRIMARY KEY,
//   firebase_uid TEXT NOT NULL,
//   fecha DATE NOT NULL,
//   activo TEXT NOT NULL,
//   tipo TEXT NOT NULL CHECK (tipo IN ('Compra','Venta')),
//   cantidad NUMERIC NOT NULL,
//   precio_entrada NUMERIC NOT NULL,
//   precio_salida NUMERIC NOT NULL,
//   comision NUMERIC DEFAULT 0,
//   estrategia TEXT,
//   resultado NUMERIC NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// CREATE INDEX IF NOT EXISTS idx_ops_uid ON operations_archive (firebase_uid);
