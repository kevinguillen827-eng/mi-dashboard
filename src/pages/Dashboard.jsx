import { useMemo } from "react";
import { useOperations } from "../hooks/useOperations";
import { computeMetrics, calcResultado, formatMoney, formatDate } from "../utils/trading";
import StatCard from "../components/StatCard";
import EquityChart from "../components/EquityChart";
import BreakdownChart from "../components/BreakdownChart";

export default function Dashboard() {
  const { operations, loading } = useOperations();
  const m = useMemo(() => computeMetrics(operations), [operations]);

  if (loading) return <p style={{ color: "var(--text-mid)" }}>Cargando operaciones en tiempo real…</p>;

  return (
    <div className="fade-in" style={{ position: "relative" }}>
      {/* Blobs decorativos flotando de fondo */}
      <div className="dash-blob-field">
        <div className="dash-blob dash-blob-1" />
        <div className="dash-blob dash-blob-2" />
        <div className="dash-blob dash-blob-3" />
      </div>

      {/* Encabezado grande estilo Bucks Sauce */}
      <h1 className="brand" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: "var(--text-hi)", marginBottom: 4, letterSpacing: "0.01em" }}>
        DASHBOARD
      </h1>
      <p style={{ color: "var(--text-mid)", fontSize: 13.5, marginBottom: 24 }}>
        Resumen general de tu desempeño como trader.
      </p>

      {/* Fila 1: métricas principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 14, position: "relative" }}>
        <div className="stagger-in" style={{ animationDelay: "0ms" }}><StatCard icon="💰" label="Balance total" value={formatMoney(m.balance)} sub={`${m.total} operaciones registradas`} tone={m.balance >= 0 ? "up" : "down"} /></div>
        <div className="stagger-in" style={{ animationDelay: "60ms" }}><StatCard icon="📈" label="Resultado del mes" value={formatMoney(m.monthPnl)} sub="Mes en curso" tone={m.monthPnl >= 0 ? "up" : "down"} /></div>
        <div className="stagger-in" style={{ animationDelay: "120ms" }}><StatCard icon="🗓️" label="Resultado semanal" value={formatMoney(m.weekPnl)} sub="Últimos 7 días" tone={m.weekPnl >= 0 ? "up" : "down"} /></div>
        <div className="stagger-in" style={{ animationDelay: "180ms" }}><StatCard icon="🎯" label="Win rate" value={m.winRate.toFixed(1) + "%"} sub={`${m.wins}G / ${m.losses}P`} /></div>
      </div>

      {/* Fila 2: métricas avanzadas de trading */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20, position: "relative" }}>
        <div className="stagger-in" style={{ animationDelay: "240ms" }}><StatCard icon="⚖️" label="Profit factor" value={Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : "∞"} sub="Ganancia bruta / Pérdida bruta" /></div>
        <div className="stagger-in" style={{ animationDelay: "300ms" }}><StatCard icon="📊" label="Expectancy" value={formatMoney(m.expectancy)} sub="Esperanza matemática por operación" tone={m.expectancy >= 0 ? "up" : "down"} /></div>
        <div className="stagger-in" style={{ animationDelay: "360ms" }}><StatCard icon="📉" label="Máximo drawdown" value={formatMoney(-m.maxDrawdown)} sub="Peor caída desde un pico" tone="down" /></div>
        <div className="stagger-in" style={{ animationDelay: "420ms" }}><StatCard icon="🔥" label="Mejor racha" value={`${m.bestWinStreak} victorias`} sub={`Peor racha: ${m.worstLossStreak} pérdidas`} /></div>
      </div>

      {/* Curva de equity */}
      <div className="card" style={{ padding: "20px 22px", marginBottom: 20, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="brand" style={{ fontSize: 15, letterSpacing: "0.03em" }}>CURVA DE CAPITAL</h3>
          <span style={{ fontSize: 11.5, color: "var(--text-low)" }}>Acumulado por operación cerrada</span>
        </div>
        <EquityChart data={m.equityCurve} />
      </div>

      {/* Desgloses por activo y estrategia */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, position: "relative", zIndex: 1 }}>
        <div className="card" style={{ padding: "20px 22px" }}>
          <h3 className="brand" style={{ fontSize: 15, letterSpacing: "0.03em", marginBottom: 14 }}>RESULTADO POR ACTIVO</h3>
          <BreakdownChart data={m.byActivo} />
        </div>
        <div className="card" style={{ padding: "20px 22px" }}>
          <h3 className="brand" style={{ fontSize: 15, letterSpacing: "0.03em", marginBottom: 14 }}>RESULTADO POR ESTRATEGIA</h3>
          <BreakdownChart data={m.byEstrategia} />
        </div>
      </div>

      {/* Mejor / peor operación */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, position: "relative", zIndex: 1 }}>
        <TradeHighlight title="Mejor operación" trade={m.bestTrade} tone="up" />
        <TradeHighlight title="Peor operación" trade={m.worstTrade} tone="down" />
      </div>

      {/* Operaciones recientes */}
      <div className="card" style={{ padding: "20px 22px", position: "relative", zIndex: 1 }}>
        <h3 className="brand" style={{ fontSize: 15, letterSpacing: "0.03em", marginBottom: 14 }}>OPERACIONES RECIENTES</h3>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr><th>Fecha</th><th>Activo</th><th>Tipo</th><th>Estrategia</th><th>Resultado</th></tr>
            </thead>
            <tbody>
              {operations.slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td style={{ color: "var(--text-mid)" }}>{formatDate(o.fecha)}</td>
                  <td style={{ fontWeight: 600 }}>{o.activo}</td>
                  <td>
                    <span className="pill" style={{ background: o.tipo === "Compra" ? "var(--green-soft)" : "var(--red-soft)", color: o.tipo === "Compra" ? "var(--green)" : "var(--red)" }}>
                      {o.tipo}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-mid)" }}>{o.estrategia || "—"}</td>
                  <td className="mono" style={{ color: calcResultado(o) >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                    {formatMoney(calcResultado(o))}
                  </td>
                </tr>
              ))}
              {operations.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-low)" }}>Aún no hay operaciones registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TradeHighlight({ title, trade, tone }) {
  const color = tone === "up" ? "var(--green)" : "var(--red)";
  return (
    <div className="card" style={{ padding: "18px 22px" }}>
      <div className="lbl">{title}</div>
      {trade ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{trade.activo} · {trade.estrategia || "Sin estrategia"}</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color, marginTop: 4 }}>{formatMoney(trade.pnl)}</div>
          <div style={{ fontSize: 12, color: "var(--text-low)", marginTop: 4 }}>{formatDate(trade.fecha)}</div>
        </>
      ) : (
        <p style={{ color: "var(--text-low)", fontSize: 13, marginTop: 8 }}>Sin datos aún.</p>
      )}
    </div>
  );
}
