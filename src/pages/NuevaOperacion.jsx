import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOperations } from "../hooks/useOperations";
import { calcResultado, formatMoney } from "../utils/trading";

const ACTIVOS_SUGERIDOS = ["EUR/USD", "GBP/USD", "XAU/USD", "BTC/USD", "ETH/USD", "AAPL", "US30", "NAS100"];
const ESTRATEGIAS_SUGERIDAS = ["Tendencia", "Ruptura de rango", "Reversión", "Momentum", "Scalping"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const EMOCIONES = ["Disciplinado", "Ansioso", "Confiado", "Impulsivo", "Neutral"];

const initialForm = {
  fecha: new Date().toISOString().slice(0, 10),
  activo: "", tipo: "Compra", cantidad: "", precioEntrada: "", precioSalida: "",
  comision: "0", estrategia: "", mercado: "Forex", timeframe: "H1",
  stopLoss: "", takeProfit: "", riesgoPct: "", emocion: "Disciplinado", notas: "",
};

export default function NuevaOperacion() {
  const { create } = useOperations();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const preview =
    form.cantidad && form.precioEntrada && form.precioSalida
      ? calcResultado({ tipo: form.tipo, cantidad: form.cantidad, precioEntrada: form.precioEntrada, precioSalida: form.precioSalida, comision: form.comision || 0 })
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await create({
        ...form,
        cantidad: Number(form.cantidad),
        precioEntrada: Number(form.precioEntrada),
        precioSalida: Number(form.precioSalida),
        comision: Number(form.comision || 0),
        stopLoss: form.stopLoss ? Number(form.stopLoss) : null,
        takeProfit: form.takeProfit ? Number(form.takeProfit) : null,
        riesgoPct: form.riesgoPct ? Number(form.riesgoPct) : null,
      });
      navigate("/historial");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: "24px 26px" }}>
        <h3 className="disp" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Registrar operación</h3>
        <p style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 22 }}>
          Se guarda en Firestore en tiempo real y, si tienes un Excel conectado, se sincroniza automáticamente.
        </p>

        <form onSubmit={handleSubmit}>
          <Row>
            <Field label="Fecha"><input required type="date" className="inp" value={form.fecha} onChange={update("fecha")} /></Field>
            <Field label="Activo">
              <input required list="activos" className="inp" placeholder="EUR/USD" value={form.activo} onChange={update("activo")} />
              <datalist id="activos">{ACTIVOS_SUGERIDOS.map((a) => <option key={a} value={a} />)}</datalist>
            </Field>
          </Row>

          <Row>
            <Field label="Mercado">
              <select className="inp" value={form.mercado} onChange={update("mercado")}>
                {["Forex", "Cripto", "Acciones", "Índices", "Materias primas"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Timeframe">
              <select className="inp" value={form.timeframe} onChange={update("timeframe")}>
                {TIMEFRAMES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Tipo">
              <select className="inp" value={form.tipo} onChange={update("tipo")}>
                <option value="Compra">Compra</option>
                <option value="Venta">Venta</option>
              </select>
            </Field>
            <Field label="Cantidad / Lotaje"><input required type="number" step="any" className="inp" value={form.cantidad} onChange={update("cantidad")} placeholder="1.0" /></Field>
          </Row>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Precio entrada"><input required type="number" step="any" className="inp" value={form.precioEntrada} onChange={update("precioEntrada")} placeholder="0.00" /></Field>
            <Field label="Precio salida"><input required type="number" step="any" className="inp" value={form.precioSalida} onChange={update("precioSalida")} placeholder="0.00" /></Field>
            <Field label="Comisión"><input type="number" step="any" className="inp" value={form.comision} onChange={update("comision")} placeholder="0.00" /></Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Stop Loss"><input type="number" step="any" className="inp" value={form.stopLoss} onChange={update("stopLoss")} placeholder="Opcional" /></Field>
            <Field label="Take Profit"><input type="number" step="any" className="inp" value={form.takeProfit} onChange={update("takeProfit")} placeholder="Opcional" /></Field>
            <Field label="Riesgo (%)"><input type="number" step="any" className="inp" value={form.riesgoPct} onChange={update("riesgoPct")} placeholder="Ej. 1.5" /></Field>
          </div>

          <Row>
            <Field label="Estrategia">
              <input list="estrategias" className="inp" value={form.estrategia} onChange={update("estrategia")} placeholder="Tendencia, ruptura, reversión..." />
              <datalist id="estrategias">{ESTRATEGIAS_SUGERIDAS.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Estado emocional">
              <select className="inp" value={form.emocion} onChange={update("emocion")}>
                {EMOCIONES.map((em) => <option key={em}>{em}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Notas">
            <textarea className="inp" rows={3} value={form.notas} onChange={update("notas")} placeholder="Contexto de la operación, gestión de riesgo, lecciones..." />
          </Field>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
            <span style={{ fontSize: 13 }}>
              {preview !== null && (
                <>Resultado estimado: <span className="mono" style={{ fontWeight: 700, color: preview >= 0 ? "var(--green)" : "var(--red)" }}>{formatMoney(preview)}</span></>
              )}
            </span>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "+ Guardar operación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>{children}</div>;
}
function Field({ label, children }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}
