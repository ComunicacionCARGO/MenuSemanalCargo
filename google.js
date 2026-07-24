/* ============================================================
   google.js
   Toda la comunicación con Google Sheets pasa por acá, a través
   del Web App de Google Apps Script (ver Code.gs / README.md).

   La web app en GitHub Pages NO tiene backend propio: el Apps
   Script publicado como Web App actúa como API. Este archivo
   solo sabe hablar con esa API mediante fetch().
   ============================================================ */

const GoogleAPI = (() => {

  /* Datos de ejemplo para poder probar la interfaz sin backend.
     Se usan automáticamente si CONFIG.APPS_SCRIPT_URL está vacío. */
  const DEMO_MENU = {
    lastUpdated: new Date().toISOString(),
    days: [
      {
        date: "2026-07-27",
        label: "Lunes",
        options: {
          comida: [
            "1. Cazuela de carne con arroz",
            "2. Milanesa de pollo con puré mixto",
            "4. Tarta pascualina",
            "Dieta: Bife de carne con vegetales al vapor"
          ],
          postre: ["Ensalada de pasta mediterránea", "Fruta"]
        }
      },
      {
        date: "2026-07-28",
        label: "Martes",
        options: {
          comida: [
            "1. Pata muslo al champignon mostaza con vegetales asados",
            "2. Ravioles con tuco",
            "4. Milanesa de soja con revuelto de zapallitos y calabacín",
            "Dieta: Pechuga grille con zapallitos"
          ],
          postre: ["Ensalada de hojas verdes, papa, semillas, tomate", "Fruta"]
        }
      }
    ]
  };

  /* Construye una URL de tipo GET con parámetros, apuntando al
     Web App de Apps Script. */
  function buildUrl(action, params = {}) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }

  /* --------------------------------------------------------
     Obtiene el menú semanal de una operación puntual.
     GET {APPS_SCRIPT_URL}?action=getMenu&operation=CMQ Cba
     -------------------------------------------------------- */
  async function getMenu(operationName) {
    // Modo demo: no hay URL configurada todavía.
    if (!CONFIG.APPS_SCRIPT_URL) {
      await new Promise((r) => setTimeout(r, 500)); // simula latencia
      return DEMO_MENU;
    }

    const cacheKey = `menuapp_cache_${operationName}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const res = await fetch(buildUrl("getMenu", { operation: operationName }));
    if (!res.ok) throw new Error("No se pudo obtener el menú.");
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    writeCache(cacheKey, data);
    return data;
  }

  /* --------------------------------------------------------
     Envía un pedido nuevo.
     POST {APPS_SCRIPT_URL}  (body JSON, action=submitOrder)
     El backend valida duplicados por legajo + fecha.
     -------------------------------------------------------- */
  async function submitOrder(order) {
    // Modo demo: simula éxito para poder probar el flujo completo.
    if (!CONFIG.APPS_SCRIPT_URL) {
      await new Promise((r) => setTimeout(r, 600));
      return { success: true };
    }

    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      // text/plain evita el preflight OPTIONS, que Apps Script
      // Web Apps no manejan bien por defecto.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "submitOrder", ...order })
    });

    if (!res.ok) throw new Error("No se pudo enviar el pedido.");
    const data = await res.json();
    return data;
  }

  /* ---- Cache liviano en localStorage con expiración ---- */
  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { value, expires } = JSON.parse(raw);
      if (Date.now() > expires) return null;
      return value;
    } catch {
      return null;
    }
  }

  function writeCache(key, value) {
    try {
      const expires = Date.now() + CONFIG.cacheMinutesMenu * 60 * 1000;
      localStorage.setItem(key, JSON.stringify({ value, expires }));
    } catch {
      /* localStorage puede fallar en modo privado; no es crítico */
    }
  }

  return { getMenu, submitOrder };
})();
