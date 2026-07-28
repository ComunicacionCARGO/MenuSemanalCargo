/* ============================================================
   doodles.js
   Fondo decorativo: iconitos de comida en línea, dibujados a
   mano en SVG (sin depender de imágenes externas), flotando
   suavemente. Si el dispositivo tiene mouse, se alejan del
   cursor al pasar cerca.

   No afecta la lógica de la app: es puramente visual y se
   desactiva solo si el usuario tiene activado
   "reducir movimiento" en su sistema operativo.
   ============================================================ */

(() => {
  "use strict";

  /* Cada ícono es un trazo simple, estilo línea fina, coherente
     con el ícono de cubiertos del resto de la app. */
  const ICONS = [
    // Queso
    `<path d="M6 38 L24 10 L42 38 Z"/><circle cx="22" cy="28" r="2"/><circle cx="30" cy="32" r="1.6"/>`,
    // Tomate
    `<circle cx="24" cy="26" r="14"/><path d="M24 12 q-3 -6 -8 -4"/><path d="M24 12 q3 -6 8 -4"/>`,
    // Hoja
    `<path d="M10 38 Q10 10 38 10 Q38 38 10 38 Z"/><path d="M12 36 Q24 24 36 12"/>`,
    // Aceitunas
    `<circle cx="16" cy="30" r="5"/><circle cx="28" cy="26" r="5"/><circle cx="24" cy="36" r="5"/><path d="M22 20 q2 -6 6 -8"/>`,
    // Pan
    `<rect x="8" y="18" width="32" height="18" rx="9"/><path d="M16 18 L20 10"/><path d="M24 18 L28 10"/><path d="M32 18 L36 10"/>`,
    // Fideos (espiral)
    `<path d="M24 24 m-2 0 a2 2 0 1 1 4 0 a6 6 0 1 1 -12 0 a10 10 0 1 1 20 0 a14 14 0 1 1 -28 0"/>`,
    // Café
    `<path d="M10 20 h20 v14 a10 10 0 0 1 -20 0 Z"/><path d="M30 22 q8 0 8 8 t-8 8"/><path d="M16 12 q2 -4 0 -6"/><path d="M22 12 q2 -4 0 -6"/>`,
    // Manzana
    `<path d="M24 14 C14 14 10 24 12 32 C14 40 20 40 24 38 C28 40 34 40 36 32 C38 24 34 14 24 14 Z"/><path d="M24 14 v-4"/><path d="M24 10 q4 -2 6 1"/>`,
    // Zanahoria
    `<path d="M20 10 L28 10 L24 40 Z"/><path d="M22 10 q-4 -6 -8 -4"/><path d="M26 10 q4 -6 8 -4"/><path d="M24 10 v-6"/>`,
    // Naranja
    `<circle cx="24" cy="24" r="16"/><path d="M24 8 v32 M8 24 h32 M13 13 l22 22 M35 13 l-22 22"/>`
  ];

  const REPEL_RADIUS = 130;   // px: distancia desde la que un dibujo empieza a "sentir" el cursor
  const REPEL_STRENGTH = 46;  // px: cuánto se aleja como máximo
  const EASE = 0.12;          // suavizado del movimiento (0-1, más chico = más lento/suave)

  const doodles = [];
  let mouseX = -9999;
  let mouseY = -9999;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function buildDoodles() {
    const container = document.getElementById("bgDoodles");
    if (!container) return;

    const isMobile = window.innerWidth < 640;
    const count = isMobile ? 7 : 12;

    for (let i = 0; i < count; i++) {
      const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
      const size = isMobile ? rand(16, 26) : rand(20, 36);

      const outer = document.createElement("div");
      outer.className = "doodle";
      outer.style.left = `${rand(2, 94)}%`;
      outer.style.top = `${rand(2, 92)}%`;

      const inner = document.createElement("div");
      inner.className = "doodle-float";
      if (!reduceMotion) {
        inner.style.setProperty("--duration", `${rand(7, 13)}s`);
        inner.style.setProperty("--delay", `${rand(-8, 0)}s`);
        inner.style.setProperty("--rot", `${rand(-12, 12)}deg`);
      }
      inner.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;

      outer.appendChild(inner);
      container.appendChild(outer);
      doodles.push({ el: outer, x: 0, y: 0, targetX: 0, targetY: 0 });
    }
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function tick() {
    doodles.forEach((d) => {
      const rect = d.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - mouseX;
      const dy = cy - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPEL_RADIUS) {
        const push = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
        const angle = Math.atan2(dy, dx);
        d.targetX = Math.cos(angle) * push;
        d.targetY = Math.sin(angle) * push;
      } else {
        d.targetX = 0;
        d.targetY = 0;
      }

      d.x += (d.targetX - d.x) * EASE;
      d.y += (d.targetY - d.y) * EASE;

      d.el.style.transform = `translate(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px)`;
    });

    requestAnimationFrame(tick);
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildDoodles();

    // Solo perseguimos el cursor en dispositivos con mouse real
    // (evita listeners inútiles en celulares/tablets).
    if (!reduceMotion && hasHover) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      requestAnimationFrame(tick);
    }
  });
})();
