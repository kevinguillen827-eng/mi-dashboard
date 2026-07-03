import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, collectionGroup, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

/**
 * Panel de administración: lista de usuarios registrados y su rol,
 * más un contador global de operaciones (requiere que las reglas de
 * Firestore permitan lectura de collectionGroup a admins — ver README).
 */
export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [opsCount, setOpsCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collectionGroup(db, "operations"));
    const unsub = onSnapshot(q, (snap) => setOpsCount(snap.size), () => setOpsCount(null));
    return unsub;
  }, []);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const toggleRole = async (u) => {
    await updateDoc(doc(db, "users", u.id), { role: u.role === "admin" ? "trader" : "admin" });
  };

  if (loading) return <p style={{ color: "var(--text-mid)" }}>Cargando panel de administración…</p>;

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div className="lbl">Usuarios registrados</div>
          <div className="mono" style={{ fontSize: 23, fontWeight: 600 }}>{users.length}</div>
        </div>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div className="lbl">Operaciones totales (todas las cuentas)</div>
          <div className="mono" style={{ fontSize: 23, fontWeight: 600 }}>{opsCount ?? "—"}</div>
        </div>
      </div>

      <div className="card">
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: "var(--text-mid)" }}>{u.email}</td>
                  <td>
                    <span className="pill" style={{ background: u.role === "admin" ? "var(--gold-soft)" : "var(--bg-panel-3)", color: u.role === "admin" ? "var(--gold)" : "var(--text-mid)" }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn-ghost" onClick={() => toggleRole(u)}>
                      {u.role === "admin" ? "Quitar admin" : "Hacer admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
