/* ============================================================
   doodles.js
   Fondo decorativo: iconitos de comida en línea, dibujados a
   mano en SVG (sin depender de imágenes externas), flotando
   suavemente. Si el dispositivo tiene mouse, se alejan del
   cursor al pasar cerca.

   DISTRIBUCIÓN (Poisson Disk Sampling / algoritmo de Bridson):
   en vez de tirar los iconos en posiciones 100% aleatorias
   (lo que genera zonas vacías y otras superpuestas), generamos
   los puntos con "muestreo de disco de Poisson": cada punto
   nuevo se propone alrededor de uno ya existente, a una
   distancia mínima garantizada, así el resultado se ve
   orgánico pero parejo, sin amontonamientos ni huecos raros,
   y SIN que ningún icono se superponga con otro.

   Además se deja libre un rectángulo alrededor de la tarjeta
   central (con un margen configurable) para que ningún icono
   quede debajo del contenido.

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

  /* -------- Parámetros de la distribución (todos configurables) -------- */
  const DESKTOP_TARGET_COUNT = 20;  // cantidad "ideal" de iconos en pantallas grandes
  const MOBILE_TARGET_COUNT = 12;   // cantidad "ideal" de iconos en pantallas chicas
  const MOBILE_BREAKPOINT = 640;    // px: debajo de esto se considera "mobile"

  const DESKTOP_SIZE_RANGE = [150, 170]; // px, igual que antes (no se tocó)
  const MOBILE_SIZE_RANGE = [80, 100];   // px, igual que antes (no se tocó)

  const MAX_ROTATION = 20;          // ±grados de rotación aleatoria fija por icono
  const MIN_GAP = 18;               // px: "aire" extra entre iconos, además de su propio tamaño
  const EDGE_PADDING = 10;          // px: margen mínimo respecto al borde de la ventana
  const EXCLUSION_MARGIN = 40;      // px: margen alrededor de la tarjeta central donde no se colocan iconos
  const POISSON_K = 30;             // intentos por punto antes de descartarlo (calidad del muestreo)
  const RESIZE_DEBOUNCE_MS = 250;   // ms: espera tras dejar de resizear antes de recalcular todo

  const doodles = [];
  let mouseX = -9999;
  let mouseY = -9999;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /* --------------------------------------------------------------------
     Devuelve el rectángulo (con margen) de la tarjeta central visible
     en este momento (pantalla de selección o de agradecimiento), para
     usarlo como zona de exclusión. Si no hay ninguna tarjeta visible
     (ej. pantalla de menú, que no tiene tarjeta centrada), no excluimos
     nada y los iconos pueden ocupar toda la pantalla.
     -------------------------------------------------------------------- */
  function getCentralCardRect(margin) {
    const selectors = [".select-card", ".thanks-card"];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left - margin,
          top: rect.top - margin,
          right: rect.right + margin,
          bottom: rect.bottom + margin
        };
      }
    }
    return null;
  }

  /* --------------------------------------------------------------------
     Poisson Disk Sampling (algoritmo de Bridson).

     Genera puntos dentro de [0,width] x [0,height] tales que:
       - ningún par de puntos queda a menos de `minDist` de distancia
         (esto es lo que evita la superposición entre iconos),
       - ningún punto cae dentro de `exclusionRect` (la tarjeta central),
       - se detiene al llegar a `maxPoints` o cuando ya no hay más lugar.

     Usa una grilla auxiliar para que buscar vecinos cercanos sea rápido,
     y una "lista activa" de puntos desde los que se siguen proponiendo
     nuevos candidatos alrededor (a una distancia entre minDist y 2*minDist),
     que es lo que le da ese aspecto orgánico y parejo a la vez.
     -------------------------------------------------------------------- */
  function poissonDiskSampling({ width, height, minDist, k, exclusionRect, maxPoints, edgePadding }) {
    const cellSize = minDist / Math.SQRT2;
    const gridWidth = Math.max(1, Math.ceil(width / cellSize));
    const gridHeight = Math.max(1, Math.ceil(height / cellSize));
    const grid = new Array(gridWidth * gridHeight).fill(-1);
    const points = [];
    const active = [];

    const gridIndex = (gx, gy) => gy * gridWidth + gx;

    function isInsideExclusion(x, y) {
      if (!exclusionRect) return false;
      return (
        x >= exclusionRect.left &&
        x <= exclusionRect.right &&
        y >= exclusionRect.top &&
        y <= exclusionRect.bottom
      );
    }

    function isFarEnough(x, y) {
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      const minGX = Math.max(gx - 2, 0);
      const maxGX = Math.min(gx + 2, gridWidth - 1);
      const minGY = Math.max(gy - 2, 0);
      const maxGY = Math.min(gy + 2, gridHeight - 1);

      for (let iy = minGY; iy <= maxGY; iy++) {
        for (let ix = minGX; ix <= maxGX; ix++) {
          const idx = grid[gridIndex(ix, iy)];
          if (idx === -1) continue;
          const p = points[idx];
          const dx = p.x - x;
          const dy = p.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < minDist) return false;
        }
      }
      return true;
    }

    function isValid(x, y) {
      if (x < edgePadding || x > width - edgePadding) return false;
      if (y < edgePadding || y > height - edgePadding) return false;
      if (isInsideExclusion(x, y)) return false;
      return isFarEnough(x, y);
    }

    function addPoint(x, y) {
      const idx = points.length;
      points.push({ x, y });
      active.push(idx);
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      grid[gridIndex(gx, gy)] = idx;
    }

    // Punto inicial: buscamos uno válido (fuera de la zona de exclusión).
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const x = rand(edgePadding, width - edgePadding);
      const y = rand(edgePadding, height - edgePadding);
      if (isValid(x, y)) {
        addPoint(x, y);
        placed = true;
      }
    }
    if (!placed) return points; // pantalla muy chica o exclusión muy grande: no entra ninguno

    while (active.length > 0 && points.length < maxPoints) {
      const activeIdx = Math.floor(Math.random() * active.length);
      const originIdx = active[activeIdx];
      const origin = points[originIdx];
      let found = false;

      for (let i = 0; i < k; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = rand(minDist, minDist * 2);
        const x = origin.x + Math.cos(angle) * radius;
        const y = origin.y + Math.sin(angle) * radius;

        if (isValid(x, y)) {
          addPoint(x, y);
          found = true;
          break;
        }
      }

      if (!found) {
        // Ya no se puede colocar nada más cerca de este punto: se retira
        // de la lista activa, pero sigue contando como icono colocado.
        active.splice(activeIdx, 1);
      }
    }

    return points;
  }

  /* --------------------------------------------------------------------
     Construye (o reconstruye, en un resize) todos los iconos de fondo.
     -------------------------------------------------------------------- */
  function buildDoodles() {
    const container = document.getElementById("bgDoodles");
    if (!container) return;

    container.innerHTML = "";
    doodles.length = 0;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < MOBILE_BREAKPOINT;

    const targetCount = isMobile ? MOBILE_TARGET_COUNT : DESKTOP_TARGET_COUNT;
    const [sizeMin, sizeMax] = isMobile ? MOBILE_SIZE_RANGE : DESKTOP_SIZE_RANGE;

    const exclusionRect = getCentralCardRect(EXCLUSION_MARGIN);

    // Distancia mínima entre CENTROS de icono: el peor caso son dos
    // iconos del tamaño máximo uno al lado del otro (cada uno aporta
    // su propio radio), más un colchón de aire (MIN_GAP) que también
    // cubre el leve crecimiento del recuadro por la rotación de ±20°.
    const minDist = sizeMax + MIN_GAP;

    const points = poissonDiskSampling({
      width,
      height,
      minDist,
      k: POISSON_K,
      exclusionRect,
      maxPoints: targetCount,
      edgePadding: EDGE_PADDING
    });

    points.forEach((point) => {
      const file = ICON_FILES[Math.floor(Math.random() * ICON_FILES.length)];
      const size = rand(sizeMin, sizeMax); // mismo rango/variación de tamaño que antes
      const baseRotation = rand(-MAX_ROTATION, MAX_ROTATION);

      const outer = document.createElement("div");
      outer.className = "doodle";
      // point.x/y son el CENTRO deseado del icono; lo convertimos a
      // top-left (que es lo que entiende el CSS) según su tamaño.
      outer.style.left = `${(point.x - size / 2).toFixed(1)}px`;
      outer.style.top = `${(point.y - size / 2).toFixed(1)}px`;

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
      // Rotación aleatoria fija de ±20°, independiente de la pequeña
      // oscilación que ya aplica la animación de flotado (--rot).
      icon.style.transform = `rotate(${baseRotation.toFixed(1)}deg)`;

      inner.appendChild(icon);
      outer.appendChild(inner);
      container.appendChild(outer);
      doodles.push({ el: outer, x: 0, y: 0, targetX: 0, targetY: 0 });
    });
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

  // Recalcula toda la distribución al cambiar el tamaño de la ventana.
  // Con debounce para no reconstruir todo en cada pixel mientras se
  // arrastra el borde de la ventana.
  let resizeTimeout = null;
  function onResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(buildDoodles, RESIZE_DEBOUNCE_MS);
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildDoodles();
    window.addEventListener("resize", onResize, { passive: true });

    // Solo perseguimos el cursor en dispositivos con mouse real
    // (evita listeners inútiles en celulares/tablets).
    if (!reduceMotion && hasHover) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      requestAnimationFrame(tick);
    }
  });
})();
