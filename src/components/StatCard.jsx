/**
 * Tarjeta de métrica individual reutilizable en dashboard y reportes.
 * tone: "up" | "down" | undefined -> colorea valor e ícono.
 */
export default function StatCard({ icon, label, value, sub, tone }) {
  const color = tone === "up" ? "var(--green)" : tone === "down" ? "var(--red)" : "var(--gold)";
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="lbl" style={{ marginBottom: 10 }}>{label}</span>
        <span style={{ color, display: "flex" }}>{icon}</span>
      </div>
      <div className="mono" style={{ fontSize: 23, fontWeight: 600, color: tone ? color : "var(--text-hi)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-low)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
