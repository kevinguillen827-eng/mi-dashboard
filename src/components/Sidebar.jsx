import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/nueva", label: "Nueva operación" },
  { to: "/historial", label: "Historial" },
  { to: "/excel", label: "Sincronización Excel" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const initial = (user.name || user.email || "T").charAt(0).toUpperCase();

  return (
    <aside
      className="desktop-only"
      style={{
        width: 232, borderRight: "1px solid var(--border-subtle)", background: "var(--bg-panel)",
        flexDirection: "column", padding: "20px 14px", position: "sticky", top: 0, height: "100vh",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", marginBottom: 26 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--gold-soft)", border: "1px solid var(--gold-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)" }}>◆</div>
        <span className="disp" style={{ fontSize: 17 }}>2030</span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {n.label}
          </NavLink>
        ))}
        {user.role === "admin" && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            Panel de administración
          </NavLink>
        )}
      </nav>

      <div style={{ display: "flex", gap: 10, paddingTop: 14, marginTop: 8, borderTop: "1px solid var(--border-subtle)", alignItems: "center" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--bg-panel-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 600, color: "var(--gold)" }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-low)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
        </div>
        <button type="button" className="icon-btn" onClick={logout} title="Cerrar sesión (Log Out)">⎋</button>
      </div>
    </aside>
  );
}
