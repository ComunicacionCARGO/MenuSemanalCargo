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

  /* Cada dibujo es un archivo .svg suelto en assets/doodles/.
     Para cambiar el arte, subí tu propio SVG con EL MISMO NOMBRE
     (ej. reemplazá doodle-01.svg) y listo, no hace falta tocar
     este archivo. El color de cada dibujo lo pone el CSS
     (var(--doodle-color) en style.css) usando el SVG como
     máscara: no importa de qué color esté dibujado tu archivo,
     en la página se va a ver siempre con el mismo color que hoy,
     tanto en modo claro como oscuro.

     Si querés agregar o sacar dibujos, agregá o quitá líneas de
     esta lista (podés usar el nombre de archivo que quieras). */
  const ICON_FILES = [
    "assets/doodles/doodle-01.svg",
    "assets/doodles/doodle-02.svg",
    "assets/doodles/doodle-03.svg",
    "assets/doodles/doodle-04.svg",
    "assets/doodles/doodle-05.svg",
    "assets/doodles/doodle-06.svg",
    "assets/doodles/doodle-07.svg",
    "assets/doodles/doodle-08.svg",
    "assets/doodles/doodle-09.svg",
    "assets/doodles/doodle-10.svg"
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
    const count = isMobile ? 12 : 20;

    for (let i = 0; i < count; i++) {
      const file = ICON_FILES[Math.floor(Math.random() * ICON_FILES.length)];
      const size = isMobile ? rand(24, 36) : rand(30, 52);

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

      // El SVG se usa como máscara (ver .doodle-icon en style.css):
      // define únicamente la silueta, el color lo pone siempre
      // var(--doodle-color), igual que antes.
      const icon = document.createElement("div");
      icon.className = "doodle-icon";
      icon.style.width = `${size}px`;
      icon.style.height = `${size}px`;
      icon.style.webkitMaskImage = `url("${file}")`;
      icon.style.maskImage = `url("${file}")`;

      inner.appendChild(icon);
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
