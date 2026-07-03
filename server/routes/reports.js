import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/reports/summary
 * Devuelve métricas agregadas del usuario autenticado desde la base SQL
 * (útil para reportes históricos pesados que no conviene calcular en el cliente).
 */
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_operaciones,
         COALESCE(SUM(resultado), 0)::float AS balance,
         COALESCE(AVG(resultado), 0)::float AS resultado_promedio,
         COUNT(*) FILTER (WHERE resultado > 0)::int AS ganadoras,
         COUNT(*) FILTER (WHERE resultado < 0)::int AS perdedoras
       FROM operations_archive
       WHERE firebase_uid = $1`,
      [req.user.uid]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al calcular el reporte.", detail: err.message });
  }
});

/**
 * POST /api/reports/archive
 * Archiva una operación desde Firestore hacia la base SQL (histórico de largo plazo).
 * Body: { fecha, activo, tipo, cantidad, precioEntrada, precioSalida, comision, estrategia, resultado }
 */
router.post("/archive", requireAuth, async (req, res) => {
  const { fecha, activo, tipo, cantidad, precioEntrada, precioSalida, comision, estrategia, resultado } = req.body;
  try {
    await pool.query(
      `INSERT INTO operations_archive
        (firebase_uid, fecha, activo, tipo, cantidad, precio_entrada, precio_salida, comision, estrategia, resultado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [req.user.uid, fecha, activo, tipo, cantidad, precioEntrada, precioSalida, comision || 0, estrategia || null, resultado]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error al archivar la operación.", detail: err.message });
  }
});

export default router;
