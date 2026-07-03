import { useState } from "react";
import { useOperations } from "../hooks/useOperations";
import { chooseSyncFile, disconnectFile, supportsFileSystemAccess, syncOperationsToFile, downloadOperationsAsExcel, reconnectStoredFile } from "../services/excelSyncService";
import { calcResultado } from "../utils/trading";

export default function ExcelSync() {
  const { operations, syncedFile, setSyncedFile, needsReconnect, setNeedsReconnect, syncError } = useOperations();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const supported = supportsFileSystemAccess();

  const handleConnect = async () => {
    setError("");
    setBusy(true);
    try {
      const name = await chooseSyncFile();
      await syncOperationsToFile(operations, calcResultado);
      setSyncedFile(name);
      setNeedsReconnect(null);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReconnect = async () => {
    setError("");
    setBusy(true);
    try {
      const name = await reconnectStoredFile();
      await syncOperationsToFile(operations, calcResultado);
      setSyncedFile(name);
      setNeedsReconnect(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectFile();
    setSyncedFile(null);
    setNeedsReconnect(null);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <div className="card" style={{ padding: "24px 26px", marginBottom: 20 }}>
        <h3 className="disp" style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Sincronización en tiempo real con Excel</h3>
        <p style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6, marginBottom: 20 }}>
          Conecta un archivo <code>.xlsx</code> local. A partir de ese momento, cada vez que agregues, borres o
          importes una operación, ese archivo se actualizará automáticamente — sin necesidad de exportar manualmente.
        </p>

        {!supported && (
          <div style={{ background: "var(--red-soft)", color: "var(--red)", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
            Tu navegador no soporta la sincronización directa con archivos (disponible en Chrome, Edge y Opera).
            Puedes usar exportación/importación manual desde el Historial mientras tanto.
          </div>
        )}

        {syncedFile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--green-soft)", padding: "12px 16px", borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>Conectado</div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--text-mid)" }}>{syncedFile}</div>
            </div>
            <button type="button" className="btn-ghost" onClick={handleDisconnect}>Desconectar</button>
          </div>
        )}

        {!syncedFile && needsReconnect && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--gold-soft)", padding: "12px 16px", borderRadius: 8, gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>Sincronización pausada</div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--text-mid)" }}>{needsReconnect}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-low)", marginTop: 4 }}>
                Tu navegador pide confirmar el permiso de nuevo tras cerrar sesión. Dale a Reconectar (no perderás nada).
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={handleReconnect} disabled={busy}>
              {busy ? "Reconectando…" : "Reconectar"}
            </button>
          </div>
        )}

        {!syncedFile && !needsReconnect && (
          <button type="button" className="btn-primary" onClick={handleConnect} disabled={!supported || busy}>
            {busy ? "Conectando…" : "Conectar archivo Excel"}
          </button>
        )}

        {error && <p style={{ color: "var(--red)", fontSize: 12.5, marginTop: 14 }}>{error}</p>}
        {syncError && <p style={{ color: "var(--red)", fontSize: 12.5, marginTop: 14 }}>{syncError}</p>}
      </div>

      <div className="card" style={{ padding: "24px 26px" }}>
        <h3 className="disp" style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Alternativa manual</h3>
        <p style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 16 }}>
          Si prefieres no dejar un archivo conectado permanentemente, puedes descargar un snapshot en cualquier momento.
        </p>
        <button type="button" className="btn-ghost" onClick={() => downloadOperationsAsExcel(operations, calcResultado)}>
          ⬇ Descargar snapshot ahora
        </button>
      </div>
    </div>
  );
}
