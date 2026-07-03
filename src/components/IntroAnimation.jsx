import { useEffect, useState } from "react";
import StarField from "./StarField";

/**
 * Pantalla de bienvenida: animación 3D del texto "2030" antes de
 * mostrar el login. Se muestra una sola vez al cargar la app
 * (o cada vez que se desmonta/monta este componente).
 *
 * Props:
 * - onFinish: callback que se dispara cuando la animación terminó
 *   y ya se puede mostrar el contenido real (el login).
 * - duration: tiempo total en ms que dura la intro antes de desvanecerse.
 */
export default function IntroAnimation({ onFinish, duration = 2400 }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), duration);
    const finishTimer = setTimeout(() => onFinish?.(), duration + 550);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={leaving ? "intro-3d-fadeout" : ""}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "radial-gradient(circle at 50% 45%, var(--brand-dark) 0%, #060402 70%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StarField count={90} />
      <div className="intro-3d-stage" style={{ position: "relative", zIndex: 1 }}>
        <span
          className="brand intro-3d-text"
          style={{
            display: "inline-block",
            fontSize: "clamp(52px, 12vw, 128px)",
            color: "var(--brand-cream)",
            lineHeight: 1,
          }}
        >
          2030
        </span>
      </div>
    </div>
  );
}
