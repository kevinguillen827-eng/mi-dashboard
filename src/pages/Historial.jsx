import { useMemo, useRef, useState } from "react";
import { useOperations } from "../hooks/useOperations";
import { calcResultado, formatMoney, formatDate } from "../utils/trading";
import { downloadOperationsAsExcel, parseExcelFile } from "../services/excelSyncService";

export default function Historial() {
  const { operations, remove, bulkCreate } = useOperations();
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const fileRef = useRef(null);
  const [toast, setToast] = useState("");

  const rows = useMemo(() => {
    return operations
      .filter((o) => (filterTipo === "Todos" ? true : o.tipo === filterTipo))
      .filter((o) => {
        if (!search) return true;
        const haystack = `${o.activo} ${o.notas} ${o.estrategia}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      });
  }, [operations, search, filterTipo]);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcelFile(file);
      await bulkCreate(parsed);
      notify(`${parsed.length} operaciones importadas`);
    } catch {
      notify("No se pudo leer el archivo");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 240 }}>
          <input className="inp" style={{ maxWidth: 280 }} placeholder="Buscar activo, estrategia, notas..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="inp" style={{ width: 140 }} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
            {["Todos", "Compra", "Venta"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>⬆ Importar Excel</button>
          <button type="button" className="btn-ghost" onClick={() => downloadOperationsAsExcel(operations, calcResultado)}>⬇ Exportar Excel</button>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />
      </div>

      {toast && (
        <div style={{ marginBottom: 12, fontSize: 12.5, color: "var(--gold)" }}>{toast}</div>
      )}

      <div className="card">
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th><th>Activo</th><th>Tipo</th><th>Cantidad</th><th>Entrada</th>
                <th>Salida</th><th>Comisión</th><th>Estrategia</th><th>Resultado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 28, color: "var(--text-low)" }}>No se encontraron operaciones con estos filtros.</td></tr>
              )}
              {rows
                .slice()
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .map((o) => {
                  const pnl = calcResultado(o);
                  return (
                    <tr key={o.id}>
                      <td style={{ color: "var(--text-mid)" }}>{formatDate(o.fecha)}</td>
                      <td style={{ fontWeight: 600 }}>{o.activo}</td>
                      <td>
                        <span className="pill" style={{ background: o.tipo === "Compra" ? "var(--green-soft)" : "var(--red-soft)", color: o.tipo === "Compra" ? "var(--green)" : "var(--red)" }}>
                          {o.tipo}
                        </span>
                      </td>
                      <td className="mono">{o.cantidad}</td>
                      <td className="mono">{Number(o.precioEntrada).toLocaleString("es-ES", { maximumFractionDigits: 5 })}</td>
                      <td className="mono">{Number(o.precioSalida).toLocaleString("es-ES", { maximumFractionDigits: 5 })}</td>
                      <td className="mono" style={{ color: "var(--text-mid)" }}>{formatMoney(Number(o.comision || 0))}</td>
                      <td style={{ color: "var(--text-mid)" }}>{o.estrategia || "—"}</td>
                      <td className="mono" style={{ color: pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{formatMoney(pnl)}</td>
                      <td><button type="button" className="icon-btn" onClick={() => remove(o.id)} title="Eliminar">✕</button></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
