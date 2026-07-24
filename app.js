/* ============================================================
   app.js
   Lógica principal de la aplicación: navegación entre pantallas,
   render del menú, formulario de pedido y validaciones.
   ============================================================ */

(() => {
  "use strict";

  /* ---------------- Referencias al DOM ---------------- */
  const els = {
    operationSelect: document.getElementById("operationSelect"),
    continueBtn: document.getElementById("continueBtn"),

    screenSelect: document.getElementById("screen-select"),
    screenMenu: document.getElementById("screen-menu"),

    backToSelect: document.getElementById("backToSelect"),
    operationName: document.getElementById("operationName"),
    menuDateRange: document.getElementById("menuDateRange"),
    lastUpdated: document.getElementById("lastUpdated"),

    loadingMenu: document.getElementById("loadingMenu"),
    menuError: document.getElementById("menuError"),
    menuErrorText: document.getElementById("menuErrorText"),
    retryMenuBtn: document.getElementById("retryMenuBtn"),
    menuDaysContainer: document.getElementById("menuDaysContainer"),
    requestMenuBtn: document.getElementById("requestMenuBtn"),

    orderModal: document.getElementById("orderModal"),
    closeModal: document.getElementById("closeModal"),
    orderForm: document.getElementById("orderForm"),
    dayField: document.getElementById("dayField"),
    nameField: document.getElementById("nameField"),
    legajoField: document.getElementById("legajoField"),
    comidaField: document.getElementById("comidaField"),
    postreField: document.getElementById("postreField"),
    formGeneralError: document.getElementById("formGeneralError"),
    confirmOrderBtn: document.getElementById("confirmOrderBtn"),

    screenThanks: document.getElementById("screen-thanks"),
    backLink: document.getElementById("backLink"),
    countdownNumber: document.getElementById("countdownNumber"),

    darkModeToggle: document.getElementById("darkModeToggle"),
    toast: document.getElementById("toast")
  };

  /* Estado en memoria de la app */
  const state = {
    selectedOperation: null, // objeto de CONFIG.operations
    menuData: null,          // respuesta de GoogleAPI.getMenu
    countdownInterval: null
  };

  /* ============================================================
     Inicialización
     ============================================================ */
  function init() {
    applyStaticText();
    populateOperationSelect();
    restoreLastOperation();
    restoreTheme();
    bindEvents();
  }

  function applyStaticText() {
    const t = CONFIG.text;
    document.getElementById("appTitle").textContent = t.appTitle;
    document.getElementById("selectPrompt").textContent = t.selectPrompt;
    document.getElementById("continueBtnLabel").textContent = t.continueBtn;
    document.getElementById("requestMenuBtnLabel").textContent = t.requestMenuBtn;
    document.getElementById("confirmOrderBtnLabel").textContent = t.confirmOrderBtn;
    document.getElementById("thankYouTitle").textContent = t.thankYouTitle;
    document.getElementById("thankYouMessage").textContent = t.thankYouMessage;
    document.getElementById("backLink").textContent = t.backLinkText;
    document.title = t.appTitle;
  }

  function populateOperationSelect() {
    CONFIG.operations.forEach((op) => {
      const opt = document.createElement("option");
      opt.value = op.id;
      opt.textContent = op.name;
      els.operationSelect.appendChild(opt);
    });
  }

  function restoreLastOperation() {
    const lastId = localStorage.getItem(CONFIG.storageKeys.lastOperation);
    if (!lastId) return;
    const exists = CONFIG.operations.some((op) => op.id === lastId);
    if (!exists) return;
    els.operationSelect.value = lastId;
    els.continueBtn.disabled = false;
  }

  function restoreTheme() {
    const dark = localStorage.getItem(CONFIG.storageKeys.darkMode) === "1";
    setTheme(dark);
  }

  function setTheme(dark) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    els.darkModeToggle.innerHTML = dark
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem(CONFIG.storageKeys.darkMode, dark ? "1" : "0");
  }

  /* ============================================================
     Eventos
     ============================================================ */
  function bindEvents() {
    els.operationSelect.addEventListener("change", () => {
      els.continueBtn.disabled = !els.operationSelect.value;
    });

    els.continueBtn.addEventListener("click", handleContinue);
    els.backToSelect.addEventListener("click", () => showScreen("select"));
    els.retryMenuBtn.addEventListener("click", () => loadMenu(state.selectedOperation));

    els.requestMenuBtn.addEventListener("click", handleRequestMenu);
    els.closeModal.addEventListener("click", closeModal);
    els.orderModal.addEventListener("click", (e) => {
      if (e.target === els.orderModal) closeModal();
    });

    els.orderForm.addEventListener("submit", handleSubmitOrder);
    els.backLink.addEventListener("click", (e) => {
      e.preventDefault();
      finishThanksFlow();
    });

    els.darkModeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(!isDark);
    });

    // Validación en tiempo real
    [els.nameField, els.legajoField].forEach((field) => {
      field.addEventListener("input", () => clearFieldError(field));
    });
    [els.dayField, els.comidaField, els.postreField].forEach((field) => {
      field.addEventListener("change", () => clearFieldError(field));
    });
  }

  /* ============================================================
     Pantalla 1 -> Pantalla 2
     ============================================================ */
  function handleContinue() {
    const opId = els.operationSelect.value;
    const operation = CONFIG.operations.find((op) => op.id === opId);
    if (!operation) return;

    state.selectedOperation = operation;
    localStorage.setItem(CONFIG.storageKeys.lastOperation, opId);

    // ---- Caso especial: operación con link externo (ej. Quorum) ----
    // No se muestra el menú en la web: se redirige directo al link
    // donde el colaborador hace su pedido.
    if (operation.mode === "external") {
      if (!operation.externalUrl) {
        showToast("Falta configurar el link externo de esta operación.", "toast-error");
        return;
      }
      window.location.href = operation.externalUrl;
      return;
    }

    els.operationName.textContent = operation.name;
    configureRequestButton(operation);
    showScreen("menu");
    loadMenu(operation);
  }

  /* Configura el botón inferior de la pantalla de menú según el
     modo de la operación: pedir por formulario, o solo volver
     (operaciones donde el pedido es presencial, ej. Ferreyra). */
  function configureRequestButton(operation) {
    const icon = document.getElementById("requestMenuBtnIcon");

    if (operation.mode === "none") {
      icon.className = "fa-solid fa-arrow-left";
      document.getElementById("requestMenuBtnLabel").textContent = CONFIG.text.backBtn;
    } else {
      icon.className = "fa-solid fa-clipboard-list";
      document.getElementById("requestMenuBtnLabel").textContent = CONFIG.text.requestMenuBtn;
    }
  }

  function showScreen(name) {
    els.screenSelect.classList.toggle("active", name === "select");
    els.screenMenu.classList.toggle("active", name === "menu");
  }

  /* ============================================================
     Carga y render del menú
     ============================================================ */
  async function loadMenu(operation) {
    els.loadingMenu.classList.remove("hidden");
    els.menuError.classList.add("hidden");
    els.menuDaysContainer.classList.add("hidden");
    els.requestMenuBtn.classList.add("hidden");

    try {
      const data = await GoogleAPI.getMenu(operation.name);
      state.menuData = data;
      renderMenu(data);

      els.loadingMenu.classList.add("hidden");
      els.menuDaysContainer.classList.remove("hidden");
      els.requestMenuBtn.classList.remove("hidden");
    } catch (err) {
      els.loadingMenu.classList.add("hidden");
      els.menuError.classList.remove("hidden");
      els.menuErrorText.textContent = err.message || "No pudimos cargar el menú. Intentá nuevamente.";
    }
  }

  function renderMenu(data) {
    els.menuDaysContainer.innerHTML = "";

    if (data.lastUpdated) {
      const d = new Date(data.lastUpdated);
      els.lastUpdated.textContent = `Última actualización: ${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
    }

    if (!data.days || !data.days.length) {
      els.menuDaysContainer.innerHTML = `<p class="muted">Todavía no hay menú cargado para esta operación.</p>`;
      return;
    }

    const first = data.days[0].date;
    const last = data.days[data.days.length - 1].date;
    els.menuDateRange.textContent = `Semana del ${formatDate(first)} al ${formatDate(last)}`;

    data.days.forEach((day) => {
      const card = document.createElement("div");
      card.className = "day-card";

      const optionsHtml = (day.options.comida || [])
        .map((opt) => `<div class="day-option">${escapeHtml(opt)}</div>`)
        .join("");

      card.innerHTML = `
        <div class="day-card-header">
          <span class="day-label">${escapeHtml(day.label)}</span>
          <span class="day-date">${formatDate(day.date)}</span>
        </div>
        <div class="day-options">${optionsHtml}</div>
      `;
      els.menuDaysContainer.appendChild(card);
    });
  }

  function formatDate(isoDate) {
    const d = new Date(`${isoDate}T00:00:00`);
    if (isNaN(d)) return isoDate;
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  }

  /* ============================================================
     Botón "Solicitar menú": formulario o link externo
     ============================================================ */
  function handleRequestMenu() {
    const operation = state.selectedOperation;
    if (!operation) return;

    if (operation.mode === "none") {
      // ---- Caso: operación sin pedido por la web (ej. Ferreyra) ----
      // El botón funciona como "Volver".
      showScreen("select");
      return;
    }

    // ---- Caso: la operación usa formulario ----
    openModal();
  }

  function openModal() {
    populateFormSelects();
    els.orderForm.reset();
    clearAllFieldErrors();
    els.formGeneralError.classList.add("hidden");
    els.orderModal.classList.remove("hidden");
    els.nameField.focus();
  }

  function closeModal() {
    els.orderModal.classList.add("hidden");
  }

  function populateFormSelects() {
    const data = state.menuData;
    if (!data || !data.days) return;

    // Día: según disponibilidad real del menú cargado
    els.dayField.innerHTML = data.days
      .map((day) => `<option value="${escapeHtml(day.label)}|${day.date}">${escapeHtml(day.label)} (${formatDate(day.date)})</option>`)
      .join("");

    fillOptionsForSelectedDay();
    els.dayField.onchange = fillOptionsForSelectedDay;
  }

  function fillOptionsForSelectedDay() {
    const data = state.menuData;
    if (!data || !data.days) return;

    const [label] = els.dayField.value.split("|");
    const day = data.days.find((d) => d.label === label) || data.days[0];
    if (!day) return;

    els.comidaField.innerHTML = (day.options.comida || [])
      .map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`)
      .join("");

    els.postreField.innerHTML = (day.options.postre || [])
      .map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`)
      .join("");
  }

  /* ============================================================
     Validación y envío del formulario
     ============================================================ */
  function handleSubmitOrder(e) {
    e.preventDefault();
    if (!validateForm()) return;

    submitOrder();
  }

  function validateForm() {
    let valid = true;

    if (!els.nameField.value.trim()) {
      setFieldError(els.nameField, "nameFieldError", "Ingresá tu nombre y apellido.");
      valid = false;
    }

    const legajo = els.legajoField.value.trim();
    if (!legajo) {
      setFieldError(els.legajoField, "legajoFieldError", "Ingresá tu legajo.");
      valid = false;
    } else if (!/^\d+$/.test(legajo)) {
      setFieldError(els.legajoField, "legajoFieldError", "El legajo debe ser numérico.");
      valid = false;
    }

    if (!els.dayField.value) {
      setFieldError(els.dayField, "dayFieldError", "Seleccioná un día.");
      valid = false;
    }
    if (!els.comidaField.value) {
      setFieldError(els.comidaField, "comidaFieldError", "Seleccioná una opción de comida.");
      valid = false;
    }
    if (!els.postreField.value) {
      setFieldError(els.postreField, "postreFieldError", "Seleccioná una opción de postre.");
      valid = false;
    }

    return valid;
  }

  function setFieldError(field, errorId, message) {
    document.getElementById(errorId).textContent = message;
    field.style.borderColor = "var(--danger)";
  }

  function clearFieldError(field) {
    const errorId = `${field.id}Error`;
    const el = document.getElementById(errorId);
    if (el) el.textContent = "";
    field.style.borderColor = "";
  }

  function clearAllFieldErrors() {
    [els.dayField, els.nameField, els.legajoField, els.comidaField, els.postreField].forEach(clearFieldError);
  }

  async function submitOrder() {
    const [dayLabel, dayDate] = els.dayField.value.split("|");

    const order = {
      operation: state.selectedOperation.name,
      day: dayLabel,
      date: dayDate,
      name: els.nameField.value.trim(),
      legajo: els.legajoField.value.trim(),
      comida: els.comidaField.value,
      postre: els.postreField.value
    };

    els.confirmOrderBtn.disabled = true;
    els.formGeneralError.classList.add("hidden");

    try {
      const result = await GoogleAPI.submitOrder(order);

      if (result.duplicate) {
        showFormError("Ya registramos un pedido con este legajo para el día seleccionado.");
        return;
      }
      if (!result.success) {
        showFormError(result.error || "No pudimos registrar tu pedido. Intentá nuevamente.");
        return;
      }

      closeModal();
      showThanksScreen();
    } catch (err) {
      showFormError(err.message || "Ocurrió un error al enviar el pedido.");
    } finally {
      els.confirmOrderBtn.disabled = false;
    }
  }

  function showFormError(message) {
    els.formGeneralError.textContent = message;
    els.formGeneralError.classList.remove("hidden");
  }

  /* ============================================================
     Pantalla de agradecimiento con cuenta regresiva
     ============================================================ */
  function showThanksScreen() {
    els.screenThanks.classList.remove("hidden");
    let seconds = CONFIG.text.countdownSeconds;
    els.countdownNumber.textContent = seconds;

    state.countdownInterval = setInterval(() => {
      seconds -= 1;
      els.countdownNumber.textContent = seconds;
      if (seconds <= 0) finishThanksFlow();
    }, 1000);
  }

  function finishThanksFlow() {
    clearInterval(state.countdownInterval);
    els.screenThanks.classList.add("hidden");
    showScreen("select");
    // Refresca el menú por si se vuelve a entrar a la misma operación
    if (state.selectedOperation) loadMenu(state.selectedOperation);
  }

  /* ============================================================
     Utilidades
     ============================================================ */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = "") {
    els.toast.textContent = message;
    els.toast.className = `toast ${type}`;
    els.toast.classList.remove("hidden");
    setTimeout(() => els.toast.classList.add("hidden"), 3500);
  }

  window.addEventListener("error", (e) => {
    console.error(e.error || e.message);
  });

  document.addEventListener("DOMContentLoaded", init);
})();
