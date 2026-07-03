import { useEffect, useRef } from "react";

/**
 * Fondo animado de estrellas blancas.
 * - Las estrellas se mueven lentamente solas (parallax flotante).
 * - Al mover el mouse dentro del contenedor, las estrellas se desplazan
 *   suavemente en dirección opuesta al cursor (efecto profundidad).
 *
 * Uso: colocarlo como primer hijo de un contenedor con position: relative.
 * <div style={{ position: "relative" }}>
 *   <StarField />
 *   ...contenido encima con position: relative / zIndex: 1
 * </div>
 */
export default function StarField({ count = 140 }) {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const stars = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    let width = 0, height = 0, raf = null;

    const resize = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const initStars = () => {
      stars.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.06,
        driftY: (Math.random() - 0.5) * 0.06,
        depth: Math.random() * 0.6 + 0.2, // qué tanto reacciona al mouse
      }));
    };

    resize();
    initStars();

    const handleResize = () => {
      resize();
      initStars();
    };

    const handleMouseMove = (e) => {
      const rect = parent.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 a 1
      mouse.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const handleMouseLeave = () => {
      mouse.current.x = 0;
      mouse.current.y = 0;
    };

    window.addEventListener("resize", handleResize);
    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);

    let t = 0;
    const animate = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      for (const s of stars.current) {
        // Deriva lenta autónoma
        s.x += s.driftX;
        s.y += s.driftY;

        // Envolver bordes
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        // Desplazamiento por mouse (parallax)
        const offsetX = -mouse.current.x * 18 * s.depth;
        const offsetY = -mouse.current.y * 18 * s.depth;

        const twinkle = Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.35 + 0.65;
        const alpha = Math.min(1, s.baseAlpha * twinkle);

        ctx.beginPath();
        ctx.arc(s.x + offsetX, s.y + offsetY, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
