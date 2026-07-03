import { useRef } from "react";

/**
 * Tarjeta de métrica individual reutilizable en dashboard y reportes.
 * tone: "up" | "down" | undefined -> colorea valor e ícono.
 *
 * Incluye un efecto "tilt 3D": la tarjeta se inclina siguiendo la
 * posición del mouse (perspectiva real vía transform), con un brillo
 * sutil que sigue el cursor.
 */
export default function StatCard({ icon, label, value, sub, tone }) {
  const color = tone === "up" ? "var(--green)" : tone === "down" ? "var(--red)" : "var(--gold)";
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0 a 1
    const py = (e.clientY - rect.top) / rect.height; // 0 a 1

    const maxTilt = 9; // grados máximos de inclinación
    const rotateY = (px - 0.5) * maxTilt * 2;
    const rotateX = -(py - 0.5) * maxTilt * 2;

    el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(6px) scale(1.015)`;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0) scale(1)";
  };

  return (
    <div className="tilt-card-wrap">
      <div
        ref={cardRef}
        className="card tilt-card"
        style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="tilt-card-shine" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <span className="lbl" style={{ marginBottom: 10 }}>{label}</span>
          <span style={{ color, display: "flex" }}>{icon}</span>
        </div>
        <div className="mono" style={{ fontSize: 23, fontWeight: 600, color: tone ? color : "var(--text-hi)", position: "relative" }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-low)", marginTop: 4, position: "relative" }}>{sub}</div>}
      </div>
    </div>
  );
}
