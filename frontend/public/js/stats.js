import { API_BASE_URL, fetchJson, formatNumber } from "./api.js";
import { initTheme } from "./ui.js";

const KEYBOARD_LAYOUTS = {
  azerty: [
    [{ key: "1", label: "1" }, { key: "2", label: "2" }, { key: "3", label: "3" }, { key: "4", label: "4" }, { key: "5", label: "5" }, { key: "6", label: "6" }, { key: "7", label: "7" }, { key: "8", label: "8" }, { key: "9", label: "9" }, { key: "0", label: "0" }],
    [{ key: "A", label: "A" }, { key: "Z", label: "Z" }, { key: "E", label: "E" }, { key: "R", label: "R" }, { key: "T", label: "T" }, { key: "Y", label: "Y" }, { key: "U", label: "U" }, { key: "I", label: "I" }, { key: "O", label: "O" }, { key: "P", label: "P" }],
    [{ key: "Q", label: "Q" }, { key: "S", label: "S" }, { key: "D", label: "D" }, { key: "F", label: "F" }, { key: "G", label: "G" }, { key: "H", label: "H" }, { key: "J", label: "J" }, { key: "K", label: "K" }, { key: "L", label: "L" }, { key: "M", label: "M" }],
    [{ key: "W", label: "W" }, { key: "X", label: "X" }, { key: "C", label: "C" }, { key: "V", label: "V" }, { key: "B", label: "B" }, { key: "N", label: "N" }],
    [{ key: "Space", label: "Espace" }],
  ],
  qwerty: [
    [{ key: "1", label: "1" }, { key: "2", label: "2" }, { key: "3", label: "3" }, { key: "4", label: "4" }, { key: "5", label: "5" }, { key: "6", label: "6" }, { key: "7", label: "7" }, { key: "8", label: "8" }, { key: "9", label: "9" }, { key: "0", label: "0" }],
    [{ key: "Q", label: "Q" }, { key: "W", label: "W" }, { key: "E", label: "E" }, { key: "R", label: "R" }, { key: "T", label: "T" }, { key: "Y", label: "Y" }, { key: "U", label: "U" }, { key: "I", label: "I" }, { key: "O", label: "O" }, { key: "P", label: "P" }],
    [{ key: "A", label: "A" }, { key: "S", label: "S" }, { key: "D", label: "D" }, { key: "F", label: "F" }, { key: "G", label: "G" }, { key: "H", label: "H" }, { key: "J", label: "J" }, { key: "K", label: "K" }, { key: "L", label: "L" }],
    [{ key: "Z", label: "Z" }, { key: "X", label: "X" }, { key: "C", label: "C" }, { key: "V", label: "V" }, { key: "B", label: "B" }, { key: "N", label: "N" }, { key: "M", label: "M" }],
    [{ key: "Space", label: "Espace" }],
  ],
  bepo: [
    [{ key: "1", label: "1" }, { key: "2", label: "2" }, { key: "3", label: "3" }, { key: "4", label: "4" }, { key: "5", label: "5" }, { key: "6", label: "6" }, { key: "7", label: "7" }, { key: "8", label: "8" }, { key: "9", label: "9" }, { key: "0", label: "0" }],
    [{ key: "B", label: "B" }, { key: "E", label: "E" }, { key: "P", label: "P" }, { key: "O", label: "O" }, { key: "È", label: "È" }, { key: "V", label: "V" }, { key: "D", label: "D" }, { key: "L", label: "L" }, { key: "J", label: "J" }, { key: "Z", label: "Z" }],
    [{ key: "A", label: "A" }, { key: "U", label: "U" }, { key: "I", label: "I" }, { key: "E", label: "É" }, { key: "C", label: "C" }, { key: "T", label: "T" }, { key: "S", label: "S" }, { key: "R", label: "R" }, { key: "N", label: "N" }, { key: "M", label: "M" }],
    [{ key: "À", label: "À" }, { key: "Y", label: "Y" }, { key: "X", label: "X" }, { key: "K", label: "K" }, { key: "Q", label: "Q" }, { key: "G", label: "G" }, { key: "H", label: "H" }, { key: "F", label: "F" }],
    [{ key: "Space", label: "Espace" }],
  ],
  dvorak: [
    [{ key: "1", label: "1" }, { key: "2", label: "2" }, { key: "3", label: "3" }, { key: "4", label: "4" }, { key: "5", label: "5" }, { key: "6", label: "6" }, { key: "7", label: "7" }, { key: "8", label: "8" }, { key: "9", label: "9" }, { key: "0", label: "0" }],
    [{ key: "'", label: "'" }, { key: ",", label: "," }, { key: ".", label: "." }, { key: "P", label: "P" }, { key: "Y", label: "Y" }, { key: "F", label: "F" }, { key: "G", label: "G" }, { key: "C", label: "C" }, { key: "R", label: "R" }, { key: "L", label: "L" }],
    [{ key: "A", label: "A" }, { key: "O", label: "O" }, { key: "E", label: "E" }, { key: "U", label: "U" }, { key: "I", label: "I" }, { key: "D", label: "D" }, { key: "H", label: "H" }, { key: "T", label: "T" }, { key: "N", label: "N" }, { key: "S", label: "S" }],
    [{ key: ";", label: ";" }, { key: "Q", label: "Q" }, { key: "J", label: "J" }, { key: "K", label: "K" }, { key: "X", label: "X" }, { key: "B", label: "B" }, { key: "M", label: "M" }, { key: "W", label: "W" }, { key: "V", label: "V" }, { key: "Z", label: "Z" }],
    [{ key: "Space", label: "Espace" }],
  ],
  colemak: [
    [{ key: "1", label: "1" }, { key: "2", label: "2" }, { key: "3", label: "3" }, { key: "4", label: "4" }, { key: "5", label: "5" }, { key: "6", label: "6" }, { key: "7", label: "7" }, { key: "8", label: "8" }, { key: "9", label: "9" }, { key: "0", label: "0" }],
    [{ key: "Q", label: "Q" }, { key: "W", label: "W" }, { key: "F", label: "F" }, { key: "P", label: "P" }, { key: "G", label: "G" }, { key: "J", label: "J" }, { key: "L", label: "L" }, { key: "U", label: "U" }, { key: "Y", label: "Y" }, { key: ";", label: ";" }],
    [{ key: "A", label: "A" }, { key: "R", label: "R" }, { key: "S", label: "S" }, { key: "T", label: "T" }, { key: "D", label: "D" }, { key: "H", label: "H" }, { key: "N", label: "N" }, { key: "E", label: "E" }, { key: "I", label: "I" }, { key: "O", label: "O" }],
    [{ key: "Z", label: "Z" }, { key: "X", label: "X" }, { key: "C", label: "C" }, { key: "V", label: "V" }, { key: "B", label: "B" }, { key: "K", label: "K" }, { key: "M", label: "M" }],
    [{ key: "Space", label: "Espace" }],
  ],
};

const state = {
  heatmapMode: "usage",
  statsScope: "standard",
  keyboardHeatmap: {},
  keyboardLayout: "azerty",
  availableKeyboardLayouts: Object.keys(KEYBOARD_LAYOUTS),
  knownUsers: [],
};

const els = {
  input: document.getElementById("stats-user-name"),
  userSuggestions: document.getElementById("stats-user-suggestions"),
  loadBtn: document.getElementById("load-user-stats-btn"),
  resetBtn: document.getElementById("reset-user-stats-btn"),
  scopeStandardBtn: document.getElementById("stats-scope-standard"),
  scopeAdaptiveBtn: document.getElementById("stats-scope-adaptive"),
  totalSessions: document.getElementById("total-sessions"),
  avgWpm: document.getElementById("avg-wpm"),
  avgAccuracy: document.getElementById("avg-accuracy"),
  avgLatencyMean: document.getElementById("avg-latency-mean"),
  avgLatencyP95: document.getElementById("avg-latency-p95"),
  keyboardLayoutSelect: document.getElementById("keyboard-layout-select"),
  topCharacters: document.getElementById("top-characters"),
  topWords: document.getElementById("top-words"),
  topSequences: document.getElementById("top-sequences"),
  topSlowCharacters: document.getElementById("top-slow-characters"),
  topSlowSequences: document.getElementById("top-slow-sequences"),
  heatmapCaption: document.getElementById("keyboard-heatmap-caption"),
  keyboardHeatmap: document.getElementById("keyboard-heatmap"),
  heatmapUsageBtn: document.getElementById("heatmap-mode-usage"),
  heatmapErrorsBtn: document.getElementById("heatmap-mode-errors"),
  heatmapLatencyBtn: document.getElementById("heatmap-mode-latency"),
};

function renderList(container, data, formatter = (value) => String(value)) {
  container.innerHTML = "";

  if (!data || !data.length) {
    container.innerHTML = '<li class="empty-state">Aucune donnee.</li>';
    return;
  }

  data.forEach(([key, value]) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    const metric = document.createElement("strong");
    label.textContent = key;
    metric.textContent = formatter(value);
    li.append(label, metric);
    container.appendChild(li);
  });
}

function resetStatsView() {
  els.totalSessions.textContent = "-";
  els.avgWpm.textContent = "-";
  els.avgAccuracy.textContent = "-";
  els.avgLatencyMean.textContent = "-";
  els.avgLatencyP95.textContent = "-";
  renderList(els.topCharacters, []);
  renderList(els.topWords, []);
  renderList(els.topSequences, []);
  renderList(els.topSlowCharacters, []);
  renderList(els.topSlowSequences, []);
  state.keyboardHeatmap = {};
  renderKeyboardHeatmap();
}

function renderUserSuggestions() {
  els.userSuggestions.innerHTML = "";
  state.knownUsers.forEach((user) => {
    const option = document.createElement("option");
    option.value = user;
    els.userSuggestions.appendChild(option);
  });
}

function toLayoutLabel(layout) {
  return String(layout || "").toUpperCase();
}

function getSupportedLayouts(layouts) {
  return (layouts || []).filter((layout) => Object.prototype.hasOwnProperty.call(KEYBOARD_LAYOUTS, layout));
}

function renderKeyboardLayoutOptions() {
  els.keyboardLayoutSelect.innerHTML = "";

  const supportedLayouts = getSupportedLayouts(state.availableKeyboardLayouts);
  const layoutsToRender = supportedLayouts.length ? supportedLayouts : ["azerty"];

  layoutsToRender.forEach((layout) => {
    const option = document.createElement("option");
    option.value = layout;
    option.textContent = toLayoutLabel(layout);
    els.keyboardLayoutSelect.appendChild(option);
  });

  if (!layoutsToRender.includes(state.keyboardLayout)) {
    state.keyboardLayout = layoutsToRender[0];
  }

  els.keyboardLayoutSelect.value = state.keyboardLayout;
}

function setStatsScope(scope) {
  state.statsScope = scope;
  els.scopeStandardBtn.classList.toggle("active", scope === "standard");
  els.scopeAdaptiveBtn.classList.toggle("active", scope === "adaptive");
  if (els.input.value.trim()) {
    loadStats();
  }
}

async function loadKnownUsers() {
  try {
    const users = await fetchJson(`${API_BASE_URL}/stats/users`);
    state.knownUsers = Array.isArray(users) ? users : [];
    renderUserSuggestions();
  } catch (error) {
    console.error("Erreur chargement utilisateurs:", error);
  }
}

async function loadAvailableKeyboardLayouts() {
  try {
    const layouts = await fetchJson(`${API_BASE_URL}/stats/keyboard-layouts`);
    const supportedLayouts = getSupportedLayouts(layouts);
    if (supportedLayouts.length) {
      state.availableKeyboardLayouts = supportedLayouts;
    }
  } catch (error) {
    console.error("Erreur chargement dispositions clavier:", error);
  }

  renderKeyboardLayoutOptions();
}

function getHeatmapMetric(stat) {
  if (!stat) {
    return 0;
  }
  if (state.heatmapMode === "errors") {
    return Number(stat.errors || 0);
  }
  if (state.heatmapMode === "latency") {
    return Number(stat.average_latency_ms || 0);
  }
  return Number(stat.hits || 0);
}

function getHeatmapCaption() {
  if (state.heatmapMode === "errors") {
    return "Chaque touche affiche le nombre d'erreurs associées.";
  }
  if (state.heatmapMode === "latency") {
    return "Chaque touche affiche sa latence moyenne en millisecondes.";
  }
  return "Chaque touche affiche le nombre de frappes validées.";
}

function getHeatmapColor(intensity) {
  const alpha = 0.12 + intensity * 0.56;
  if (state.heatmapMode === "errors") {
    return `rgba(173, 61, 47, ${alpha})`;
  }
  if (state.heatmapMode === "latency") {
    return `rgba(166, 106, 0, ${alpha})`;
  }
  return `rgba(28, 124, 84, ${alpha})`;
}

function getHeatmapValueLabel(key, stat) {
  if (!stat) {
    return `${key}\nAucune donnee`;
  }
  if (state.heatmapMode === "errors") {
    return `${key}\n${stat.errors || 0} erreur(s)`;
  }
  if (state.heatmapMode === "latency") {
    return `${key}\n${formatNumber(stat.average_latency_ms || 0)} ms`;
  }
  return `${key}\n${stat.hits || 0} frappe(s)`;
}

function renderKeyboardHeatmap() {
  els.keyboardHeatmap.innerHTML = "";
  els.heatmapCaption.textContent = getHeatmapCaption();

  const stats = state.keyboardHeatmap || {};
  const layout = KEYBOARD_LAYOUTS[state.keyboardLayout] || KEYBOARD_LAYOUTS.azerty;
  const metrics = layout
    .flat()
    .map((keyConfig) => getHeatmapMetric(stats[keyConfig.key]))
    .filter((value) => value > 0);
  const maxMetric = metrics.length ? Math.max(...metrics) : 0;

  if (!maxMetric) {
    els.keyboardHeatmap.innerHTML = '<p class="empty-state">Aucune donnee clavier disponible pour le moment.</p>';
    return;
  }

  layout.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";

    row.forEach((keyConfig) => {
      const stat = stats[keyConfig.key];
      const metric = getHeatmapMetric(stat);
      const intensity = maxMetric ? metric / maxMetric : 0;

      const keyEl = document.createElement("div");
      keyEl.className = "keyboard-key";
      keyEl.style.background = metric ? getHeatmapColor(intensity) : "var(--panel-strong)";
      keyEl.style.borderColor = metric ? "transparent" : "var(--line)";
      if (keyConfig.key === "Space") {
        keyEl.classList.add("keyboard-key-space");
      }

      const title = document.createElement("strong");
      title.textContent = keyConfig.label;
      const value = document.createElement("span");
      value.textContent = metric
        ? state.heatmapMode === "latency" ? `${formatNumber(metric)} ms` : String(metric)
        : "-";

      keyEl.title = getHeatmapValueLabel(keyConfig.label, stat);
      keyEl.append(title, value);
      rowEl.appendChild(keyEl);
    });

    els.keyboardHeatmap.appendChild(rowEl);
  });
}

async function persistKeyboardLayout() {
  const user = els.input.value.trim();
  if (!user) {
    return;
  }

  try {
    const data = await fetchJson(`${API_BASE_URL}/stats/user/${encodeURIComponent(user)}/keyboard-layout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyboard_layout: state.keyboardLayout }),
    });

    if (Array.isArray(data.available_keyboard_layouts) && data.available_keyboard_layouts.length) {
      const supportedLayouts = getSupportedLayouts(data.available_keyboard_layouts);
      if (supportedLayouts.length) {
        state.availableKeyboardLayouts = supportedLayouts;
      }
    }
    if (KEYBOARD_LAYOUTS[data.keyboard_layout]) {
      state.keyboardLayout = data.keyboard_layout;
    }
    renderKeyboardLayoutOptions();
    renderKeyboardHeatmap();
  } catch (error) {
    console.error(error);
    alert("Impossible d'enregistrer la disposition clavier.");
  }
}

function setKeyboardLayout(layout, persist = false) {
  if (!KEYBOARD_LAYOUTS[layout]) {
    return;
  }

  state.keyboardLayout = layout;
  els.keyboardLayoutSelect.value = layout;
  renderKeyboardHeatmap();

  if (persist) {
    persistKeyboardLayout();
  }
}

function setHeatmapMode(mode) {
  state.heatmapMode = mode;
  els.heatmapUsageBtn.classList.toggle("active", mode === "usage");
  els.heatmapErrorsBtn.classList.toggle("active", mode === "errors");
  els.heatmapLatencyBtn.classList.toggle("active", mode === "latency");
  renderKeyboardHeatmap();
}

async function loadStats() {
  const user = els.input.value.trim();
  if (!user) {
    alert("Entre un nom");
    return;
  }

  try {
    const data = await fetchJson(
      `${API_BASE_URL}/stats/user/${encodeURIComponent(user)}?scope=${encodeURIComponent(state.statsScope)}`
    );

    state.keyboardLayout = KEYBOARD_LAYOUTS[data.keyboard_layout] ? data.keyboard_layout : "azerty";
    if (Array.isArray(data.available_keyboard_layouts) && data.available_keyboard_layouts.length) {
      const supportedLayouts = getSupportedLayouts(data.available_keyboard_layouts);
      if (supportedLayouts.length) {
        state.availableKeyboardLayouts = supportedLayouts;
      }
    }
    renderKeyboardLayoutOptions();

    els.totalSessions.textContent = String(data.total_sessions ?? 0);
    els.avgWpm.textContent = formatNumber(data.average_wpm);
    els.avgAccuracy.textContent = `${formatNumber(data.average_accuracy)}%`;
    els.avgLatencyMean.textContent = `${formatNumber(data.average_latency_mean_ms)} ms`;
    els.avgLatencyP95.textContent = `${formatNumber(data.average_latency_p95_ms)} ms`;
    renderList(els.topCharacters, data.top_characters);
    renderList(els.topWords, data.top_words);
    renderList(els.topSequences, data.top_sequences || data.top_bigrams);
    renderList(els.topSlowCharacters, data.top_slow_characters, (value) => `${formatNumber(value)} ms`);
    renderList(els.topSlowSequences, data.top_slow_sequences || data.top_slow_bigrams, (value) => `${formatNumber(value)} ms`);
    state.keyboardHeatmap = data.keyboard_heatmap || {};
    renderKeyboardHeatmap();
  } catch (error) {
    console.error(error);
    resetStatsView();
    if (!String(error.message || "").includes("No sessions found")) {
      alert(error.message || "Erreur chargement stats");
    }
  }
}

async function resetUserStats() {
  const user = els.input.value.trim();

  if (!user) {
    alert("Entre un nom à réinitialiser.");
    return;
  }

  if (!window.confirm(`Supprimer toutes les stats de ${user} ?`)) {
    return;
  }

  try {
    await fetchJson(`${API_BASE_URL}/stats/user/${encodeURIComponent(user)}`, {
      method: "DELETE",
    });
    resetStatsView();
    await loadKnownUsers();
    alert("Les stats ont été réinitialisées.");
  } catch (error) {
    console.error(error);
    alert("Erreur lors de la réinitialisation des stats.");
  }
}

function bindEvents() {
  els.loadBtn.addEventListener("click", loadStats);
  els.resetBtn.addEventListener("click", resetUserStats);
  els.keyboardLayoutSelect.addEventListener("change", (event) => {
    setKeyboardLayout(event.target.value, true);
  });
  els.scopeStandardBtn.addEventListener("click", () => setStatsScope("standard"));
  els.scopeAdaptiveBtn.addEventListener("click", () => setStatsScope("adaptive"));
  els.heatmapUsageBtn.addEventListener("click", () => setHeatmapMode("usage"));
  els.heatmapErrorsBtn.addEventListener("click", () => setHeatmapMode("errors"));
  els.heatmapLatencyBtn.addEventListener("click", () => setHeatmapMode("latency"));
}

function init() {
  initTheme();
  bindEvents();
  resetStatsView();
  loadAvailableKeyboardLayouts();
  loadKnownUsers();
}

init();
