/* ============================================================
   config.js
   Configuración central de la aplicación.
   Acá se define TODO lo que un administrador podría necesitar
   tocar sin meterse en la lógica de la app (app.js) ni en el
   diseño (style.css).
   ============================================================ */

const CONFIG = {

  /* --------------------------------------------------------
     URL del Web App de Google Apps Script.
     Se completa DESPUÉS de publicar el script (ver README.md,
     paso "Publicar como Web App"). Mientras esté vacía, la app
     va a mostrar datos de ejemplo (modo demo) para que puedas
     probar el diseño sin tener el backend listo todavía.
     -------------------------------------------------------- */
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwFVbo_P_uye9hIpc2PQqmJOTqM-xpemxaYcjc9CCfnBK9W00ZwRnLvzYj0nA3RNGGZDg/exec",

  /* --------------------------------------------------------
     Operaciones disponibles y su configuración individual.
     Cada operación puede:
       - usar formulario propio (mode: "form")
       - redirigir a un link externo (mode: "external")
       - no ofrecer pedido por la web (mode: "none"): se ve el
         menú pero en vez de "Solicitar menú" aparece "Volver".
         Útil para operaciones donde el pedido se hace de forma
         presencial (ej. en el comedor).

     Para cambiar cómo pide el menú una operación, tocá
     únicamente el campo "mode" y, si corresponde, "externalUrl".
     -------------------------------------------------------- */
  operations: [
    {
      id: "cmq-cba",
      name: "CMQ Cba",
      mode: "form", // "form" | "external" | "none"
      externalUrl: "" // solo se usa si mode === "external"
    },
    {
      id: "ferreyra",
      name: "Ferreyra",

      // ---- CASO ESPECIAL: en Ferreyra los pedidos se hacen ----
      // ---- presencialmente en el comedor, no por la web    ----
      mode: "none",
      externalUrl: ""
    },
    {
      id: "clc",
      name: "CLC",
      mode: "form",
      externalUrl: ""
    },
    {
      id: "pertrak",
      name: "Pertrak",
      mode: "form",
      externalUrl: "",

      // ---- CASO ESPECIAL: en Pertrak hay que elegir además ----
      // ---- dónde se va a comer (depósito o comedor).       ----
      // Si una operación no necesita este campo, simplemente
      // no se declara "locationOptions" (o se deja vacío).
      locationOptions: ["Depósito", "Comedor"]
    },
    {
      id: "quorum",
      name: "Quorum",

      // ---- CASO ESPECIAL: Quorum no usa formulario propio ----
      // Si la operación usa formulario:
      // mode: "form"
      //
      // Si la operación utiliza un enlace externo:
      // mode: "external"  +  completar externalUrl
      mode: "external",
      externalUrl: "https://flykitchen.com.ar/accesoclientes"
    }
  ],

  /* --------------------------------------------------------
     Textos generales de la app. Cambiarlos acá se refleja en
     toda la interfaz sin tocar el HTML.
     -------------------------------------------------------- */
  text: {
    appTitle: "Menú semanal",
    selectPrompt: "Elegí tu operación",
    continueBtn: "Continuar",
    requestMenuBtn: "Solicitar menú",
    backBtn: "Volver",
    confirmOrderBtn: "Confirmar pedido",
    thankYouTitle: "¡Muchas gracias!",
    thankYouMessage: "Tu pedido fue registrado correctamente.",
    // Mensaje que se muestra en la pantalla de agradecimiento
    // cuando el pedido confirmado es un "Nuevo pedido" duplicado
    // (segundo pedido del mismo legajo para el mismo día).
    thankYouMessageCharged: "Tu pedido fue registrado correctamente. Al ser un segundo pedido para el mismo día, se cobrará el 100% del valor.",
    backLinkText: "Volver atrás",
    countdownSeconds: 10,

    // ---- Aviso de legajo duplicado (mismo legajo + mismo día) ----
    duplicateTitle: "Ya existe un pedido con este legajo",
    duplicateMessage: "Ya se registró un pedido con este legajo para el día seleccionado. Si confirmás un segundo pedido, se cobrará el 100% del valor al colaborador.",
    duplicateCancelBtn: "Cancelar",
    duplicateModifyBtn: "Modificar pedido",
    duplicateNewBtn: "Nuevo pedido (100%)"
  },

  /* --------------------------------------------------------
     Tiempo de caché de los datos del menú (en minutos).
     Evita golpear Google Sheets en cada click; se refresca
     solo cuando vence el tiempo o el usuario cambia de operación.
     -------------------------------------------------------- */
  cacheMinutesMenu: 5,

  /* --------------------------------------------------------
     Clave de localStorage para recordar la última operación.
     -------------------------------------------------------- */
  storageKeys: {
    lastOperation: "menuapp_last_operation",
    darkMode: "menuapp_dark_mode"
  }
};
