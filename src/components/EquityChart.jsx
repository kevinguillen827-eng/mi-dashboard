import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatMoney, formatDate } from "../utils/trading";

export default function EquityChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-low)", fontSize: 13 }}>
        Aún no hay datos suficientes.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c6a15b" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#c6a15b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1a1e29" vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={formatDate} stroke="#5c6273" fontSize={10.5} tickLine={false} axisLine={false} minTickGap={30} />
        <YAxis stroke="#5c6273" fontSize={10.5} tickFormatter={formatMoney} tickLine={false} axisLine={false} width={70} />
        <Tooltip
          contentStyle={{ background: "#171b25", border: "1px solid #232838", borderRadius: 8, fontSize: 12 }}
          labelFormatter={formatDate}
          formatter={(v) => [formatMoney(v), "Equity"]}
        />
        <Area type="monotone" dataKey="equity" stroke="#c6a15b" strokeWidth={2.2} fill="url(#eqFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
