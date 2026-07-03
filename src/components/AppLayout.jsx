import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

const TITLES = {
  "/": "Dashboard",
  "/nueva": "Nueva operación",
  "/historial": "Historial de operaciones",
  "/excel": "Sincronización Excel",
  "/admin": "Panel de administración",
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = TITLES[location.pathname] || "2030";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div className="mobile-only" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
        <span className="disp" style={{ fontSize: 15 }}>LEDGER</span>
        <button type="button" onClick={() => setMobileOpen((v) => !v)} style={{ background: "transparent", border: "none", color: "var(--text-hi)", fontSize: 18 }}>☰</button>
      </div>
      {mobileOpen && (
        <div className="mobile-only" style={{ position: "fixed", top: 49, left: 0, right: 0, zIndex: 30, background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)", padding: 12, flexDirection: "column", gap: 4 }}>
          {[["/", "Dashboard"], ["/nueva", "Nueva operación"], ["/historial", "Historial"], ["/excel", "Sincronización Excel"]].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>{label}</NavLink>
          ))}
          {user?.role === "admin" && <NavLink to="/admin" onClick={() => setMobileOpen(false)} className="nav-item">Panel de administración</NavLink>}
          <div className="nav-item" onClick={logout}>⎋ Cerrar sesión</div>
        </div>
      )}

      <main style={{ flex: 1, padding: "28px 32px", maxWidth: "100%" }}>
        <div className="mobile-only" style={{ height: 40 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="disp" style={{ fontSize: 22, fontWeight: 500 }}>{title}</h1>
            <p style={{ fontSize: 12.5, color: "var(--text-low)", marginTop: 2, textTransform: "capitalize" }}>
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
