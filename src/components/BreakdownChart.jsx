import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatMoney } from "../utils/trading";

/** Barras horizontales de PnL agrupado (por activo, estrategia, etc.) */
export default function BreakdownChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: "var(--text-low)", fontSize: 13, padding: "20px 0" }}>Sin datos.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" tickFormatter={formatMoney} stroke="#5c6273" fontSize={10.5} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="key" stroke="#9aa1b0" fontSize={12} width={100} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#171b25", border: "1px solid #232838", borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [formatMoney(v), "Resultado"]}
        />
        <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnl >= 0 ? "#52a374" : "#bd5c56"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
