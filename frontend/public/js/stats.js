import { API_BASE_URL, fetchJson, formatNumber } from "./api.js";
import { initTheme } from "./ui.js";

const KEYBOARD_LAYOUT = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["W", "X", "C", "V", "B", "N"],
  ["Space"],
];

const state = {
  heatmapMode: "usage",
  statsScope: "standard",
  keyboardHeatmap: {},
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
  const metrics = KEYBOARD_LAYOUT.flat().map((key) => getHeatmapMetric(stats[key])).filter((value) => value > 0);
  const maxMetric = metrics.length ? Math.max(...metrics) : 0;

  if (!maxMetric) {
    els.keyboardHeatmap.innerHTML = '<p class="empty-state">Aucune donnee clavier disponible pour le moment.</p>';
    return;
  }

  KEYBOARD_LAYOUT.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";

    row.forEach((key) => {
      const stat = stats[key];
      const metric = getHeatmapMetric(stat);
      const intensity = maxMetric ? metric / maxMetric : 0;

      const keyEl = document.createElement("div");
      keyEl.className = "keyboard-key";
      keyEl.style.background = metric ? getHeatmapColor(intensity) : "var(--panel-strong)";
      keyEl.style.borderColor = metric ? "transparent" : "var(--line)";
      if (key === "Space") {
        keyEl.classList.add("keyboard-key-space");
      }

      const title = document.createElement("strong");
      title.textContent = key === "Space" ? "Espace" : key;
      const value = document.createElement("span");
      value.textContent = metric
        ? state.heatmapMode === "latency" ? `${formatNumber(metric)} ms` : String(metric)
        : "-";

      keyEl.title = getHeatmapValueLabel(key, stat);
      keyEl.append(title, value);
      rowEl.appendChild(keyEl);
    });

    els.keyboardHeatmap.appendChild(rowEl);
  });
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
  loadKnownUsers();
}

init();
