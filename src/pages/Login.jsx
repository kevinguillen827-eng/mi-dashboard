import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, loginEmail, registerEmail, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Única fuente de verdad para redirigir: en cuanto el contexto confirma
  // que hay un usuario autenticado (con su perfil ya cargado de Firestore),
  // se manda al dashboard. Evita la carrera entre navigate() manual y la
  // actualización asíncrona de onAuthStateChanged.
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await loginEmail(email, password);
      } else {
        await registerEmail(name, email, password);
      }
      // No navegamos aquí: el useEffect de arriba se encarga
      // en cuanto el contexto detecte la sesión.
    } catch (err) {
      setError(mapFirebaseError(err.code));
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await loginGoogle();
    } catch (err) {
      setError(mapFirebaseError(err.code));
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      <div
        className="desktop-only"
        style={{
          flex: 1.1, background: "radial-gradient(circle at 20% 20%, #14181f 0%, #0a0c10 65%)",
          borderRight: "1px solid var(--border-subtle)", flexDirection: "column",
          justifyContent: "space-between", padding: 48, minHeight: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "var(--gold-soft)", border: "1px solid var(--gold-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)" }}>◆</div>
          <span className="disp" style={{ fontSize: 19 }}>LEDGER</span>
        </div>
        <div>
          <h1 className="disp" style={{ fontSize: 34, lineHeight: 1.25, marginTop: 28, fontWeight: 500, maxWidth: 440 }}>
            Cada operación, registrada.<br />Cada decisión, medida.
          </h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 14, maxWidth: 380, lineHeight: 1.6 }}>
            Diario de trading profesional con autenticación Firebase, base de datos en tiempo real y sincronización directa con Excel.
          </p>
        </div>
        <p style={{ color: "var(--text-low)", fontSize: 12 }}>Tus datos se guardan de forma segura y privada por usuario.</p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }} className="fade-in">
          <h2 className="disp" style={{ fontSize: 24, fontWeight: 500, marginBottom: 6 }}>
            {mode === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
          </h2>
          <p style={{ color: "var(--text-mid)", fontSize: 13.5, marginBottom: 26 }}>
            {mode === "login" ? "Accede a tu diario de operaciones." : "Regístrate para empezar a registrar tus operaciones."}
          </p>

          <button type="button" className="btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "11px 16px", marginBottom: 16 }} onClick={handleGoogle} disabled={busy}>
            Continuar con Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
            <span style={{ fontSize: 11, color: "var(--text-low)" }}>O CON TU CORREO</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div style={{ marginBottom: 14 }}>
                <label className="lbl">Nombre</label>
                <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label className="lbl">Correo electrónico</label>
              <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="lbl">Contraseña</label>
              <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            {error && <p style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 14 }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={busy}>
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>

          <p style={{ fontSize: 12.5, color: "var(--text-mid)", marginTop: 20, textAlign: "center" }}>
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); }} style={{ color: "var(--gold)" }}>
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function mapFirebaseError(code) {
  const map = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-email": "Correo inválido.",
    "auth/popup-closed-by-user": "Ventana de Google cerrada antes de completar.",
  };
  return map[code] || "Ocurrió un error. Inténtalo de nuevo.";
}
