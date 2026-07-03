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
    <div className="fade-in">
      {/* Fila 1: métricas principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 14 }}>
        <StatCard icon="💰" label="Balance total" value={formatMoney(m.balance)} sub={`${m.total} operaciones registradas`} tone={m.balance >= 0 ? "up" : "down"} />
        <StatCard icon="📈" label="Resultado del mes" value={formatMoney(m.monthPnl)} sub="Mes en curso" tone={m.monthPnl >= 0 ? "up" : "down"} />
        <StatCard icon="🗓️" label="Resultado semanal" value={formatMoney(m.weekPnl)} sub="Últimos 7 días" tone={m.weekPnl >= 0 ? "up" : "down"} />
        <StatCard icon="🎯" label="Win rate" value={m.winRate.toFixed(1) + "%"} sub={`${m.wins}G / ${m.losses}P`} />
      </div>

      {/* Fila 2: métricas avanzadas de trading */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="⚖️" label="Profit factor" value={Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : "∞"} sub="Ganancia bruta / Pérdida bruta" />
        <StatCard icon="📊" label="Expectancy" value={formatMoney(m.expectancy)} sub="Esperanza matemática por operación" tone={m.expectancy >= 0 ? "up" : "down"} />
        <StatCard icon="📉" label="Máximo drawdown" value={formatMoney(-m.maxDrawdown)} sub="Peor caída desde un pico" tone="down" />
        <StatCard icon="🔥" label="Mejor racha" value={`${m.bestWinStreak} victorias`} sub={`Peor racha: ${m.worstLossStreak} pérdidas`} />
      </div>

      {/* Curva de equity */}
      <div className="card" style={{ padding: "20px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="disp" style={{ fontSize: 16, fontWeight: 500 }}>Curva de capital</h3>
          <span style={{ fontSize: 11.5, color: "var(--text-low)" }}>Acumulado por operación cerrada</span>
        </div>
        <EquityChart data={m.equityCurve} />
      </div>

      {/* Desgloses por activo y estrategia */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: "20px 22px" }}>
          <h3 className="disp" style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>Resultado por activo</h3>
          <BreakdownChart data={m.byActivo} />
        </div>
        <div className="card" style={{ padding: "20px 22px" }}>
          <h3 className="disp" style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>Resultado por estrategia</h3>
          <BreakdownChart data={m.byEstrategia} />
        </div>
      </div>

      {/* Mejor / peor operación */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <TradeHighlight title="Mejor operación" trade={m.bestTrade} tone="up" />
        <TradeHighlight title="Peor operación" trade={m.worstTrade} tone="down" />
      </div>

      {/* Operaciones recientes */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <h3 className="disp" style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>Operaciones recientes</h3>
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
