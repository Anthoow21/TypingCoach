import { API_BASE_URL, fetchJson, formatNumber } from "./api.js";
import { initTheme, renderKeyValueList, renderSimpleList } from "./ui.js";

const state = {
  entries: [],
  filter: "all",
  page: 1,
  pageSize: 6,
};

const els = {
  filterAllBtn: document.getElementById("history-filter-all"),
  filterSessionsBtn: document.getElementById("history-filter-sessions"),
  filterSeriesBtn: document.getElementById("history-filter-series"),
  filterAdaptiveBtn: document.getElementById("history-filter-adaptive"),
  searchInput: document.getElementById("history-search"),
  refreshBtn: document.getElementById("refresh-results-btn"),
  historyList: document.getElementById("results-history"),
  historyPagination: document.getElementById("history-pagination"),
  historyPrevBtn: document.getElementById("history-prev-btn"),
  historyNextBtn: document.getElementById("history-next-btn"),
  historyPageLabel: document.getElementById("history-page-label"),
  sessionModal: document.getElementById("session-modal"),
  sessionModalBackdrop: document.getElementById("session-modal-backdrop"),
  closeSessionModalBtn: document.getElementById("close-session-modal-btn"),
  modalSessionTitle: document.getElementById("modal-session-title"),
  modalWpm: document.getElementById("modal-wpm"),
  modalAccuracy: document.getElementById("modal-accuracy"),
  modalErrors: document.getElementById("modal-errors"),
  modalMistakesByCharacter: document.getElementById("modal-mistakes-by-character"),
  modalWeakWords: document.getElementById("modal-weak-words"),
  modalWeakSequences: document.getElementById("modal-weak-sequences"),
  modalSuggestedFocus: document.getElementById("modal-suggested-focus"),
};

function setFilter(filter) {
  state.filter = filter;
  state.page = 1;
  els.filterAllBtn.classList.toggle("active", filter === "all");
  els.filterSessionsBtn.classList.toggle("active", filter === "sessions");
  els.filterSeriesBtn.classList.toggle("active", filter === "series");
  els.filterAdaptiveBtn.classList.toggle("active", filter === "adaptive");
  renderHistoryPage();
}

function getFilteredEntries() {
  const search = els.searchInput.value.trim().toLowerCase();

  return state.entries.filter((entry) => {
    if (state.filter === "sessions" && entry.type !== "session") {
      return false;
    }
    if (state.filter === "series" && entry.type !== "series") {
      return false;
    }
    if (state.filter === "adaptive" && !(entry.type === "session" && entry.isAdaptive)) {
      return false;
    }

    if (!search) {
      return true;
    }

    return entry.searchText.includes(search);
  });
}

function createSessionCard(result) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-card-button";
  button.innerHTML = `
    <div class="history-card-top">
      <div class="history-main">
        <strong>Session #${result.session_id}</strong>
        <span>${result.user_name || "Utilisateur inconnu"} · ${new Date(result.created_at).toLocaleString("fr-FR")}</span>
      </div>
      <span class="history-pill">${result.exercise_difficulty === "adaptive" ? "Practice cible" : "Session"}</span>
    </div>
    <div class="history-meta-row">
      <span>${result.exercise_title || "Exercice sans titre"}</span>
      <span>WPM · ${formatNumber(result.wpm)}</span>
      <span>Accuracy · ${formatNumber(result.accuracy)} %</span>
      <span>Erreurs · ${result.error_count}</span>
    </div>
  `;
  button.addEventListener("click", () => showSessionDetail(result.session_id));

  const card = document.createElement("article");
  card.className = "history-card";
  card.appendChild(button);
  return card;
}

function createSeriesCard(seriesId, results) {
  const card = document.createElement("section");
  card.className = "history-group-card";

  const averageWpm = results.reduce((sum, item) => sum + Number(item.wpm || 0), 0) / results.length;
  const averageAccuracy = results.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / results.length;

  const head = document.createElement("button");
  head.type = "button";
  head.className = "history-group-toggle";
  head.innerHTML = `
    <div class="history-card-top">
      <div class="history-main">
        <strong>Série #${seriesId}</strong>
        <span>${results.length} session(s)</span>
      </div>
      <span class="history-pill">Série</span>
    </div>
    <div class="history-meta-row">
      <span>WPM moyen · ${formatNumber(averageWpm)}</span>
      <span>Accuracy moyenne · ${formatNumber(averageAccuracy)} %</span>
    </div>
  `;

  const body = document.createElement("div");
  body.className = "history-group-body";

  results.forEach((result) => {
    body.appendChild(createSessionCard(result));
  });

  head.addEventListener("click", () => {
    body.classList.toggle("hidden");
  });

  card.append(head, body);
  return card;
}

function buildDisplayEntries(results) {
  const entries = [];
  const grouped = new Map();

  results.forEach((result) => {
    if (result.practice_series_id) {
      if (!grouped.has(result.practice_series_id)) {
        grouped.set(result.practice_series_id, []);
      }
      grouped.get(result.practice_series_id).push(result);
      return;
    }

    entries.push({
      type: "session",
      isAdaptive: result.exercise_difficulty === "adaptive",
      searchText: `${result.user_name || ""} ${result.exercise_title || ""} ${result.session_id}`.toLowerCase(),
      node: createSessionCard(result),
    });
  });

  grouped.forEach((seriesResults, seriesId) => {
    entries.push({
      type: "series",
      isAdaptive: false,
      searchText: `${seriesId} ${seriesResults.map((item) => `${item.user_name || ""} ${item.exercise_title || ""}`).join(" ")}`.toLowerCase(),
      node: createSeriesCard(seriesId, seriesResults),
    });
  });

  return entries;
}

function renderHistoryPage() {
  const entries = getFilteredEntries();
  const totalPages = Math.max(1, Math.ceil(entries.length / state.pageSize));

  if (state.page > totalPages) {
    state.page = totalPages;
  }

  const start = (state.page - 1) * state.pageSize;
  const visibleEntries = entries.slice(start, start + state.pageSize);

  els.historyList.innerHTML = "";

  if (!entries.length) {
    els.historyList.innerHTML = '<p class="empty-state">Aucun résultat pour ce filtre.</p>';
    els.historyPagination.classList.add("hidden");
    return;
  }

  visibleEntries.forEach((entry) => {
    els.historyList.appendChild(entry.node);
  });

  if (entries.length <= state.pageSize) {
    els.historyPagination.classList.add("hidden");
    return;
  }

  els.historyPagination.classList.remove("hidden");
  els.historyPageLabel.textContent = `Page ${state.page} / ${totalPages}`;
  els.historyPrevBtn.disabled = state.page === 1;
  els.historyNextBtn.disabled = state.page === totalPages;
}

async function loadResultsHistory() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/results`);
    const results = Array.isArray(data) ? data : [data];
    state.entries = buildDisplayEntries(results.reverse());
    state.page = 1;
    renderHistoryPage();
  } catch (error) {
    console.error("Erreur chargement résultats:", error);
    els.historyList.innerHTML = '<p class="empty-state">Impossible de charger l’historique.</p>';
  }
}

function openSessionModal() {
  els.sessionModal.classList.remove("hidden");
}

function closeSessionModal() {
  els.sessionModal.classList.add("hidden");
}

async function showSessionDetail(sessionId) {
  try {
    const results = await fetchJson(`${API_BASE_URL}/results/session/${sessionId}`);
    const analysis = await fetchJson(`${API_BASE_URL}/analyses/session/${sessionId}`);
    const payload = analysis.analysis_payload || {};

    els.modalSessionTitle.textContent = `Session #${sessionId}`;
    els.modalWpm.textContent = formatNumber(results.wpm);
    els.modalAccuracy.textContent = `${formatNumber(results.accuracy)} %`;
    els.modalErrors.textContent = String(results.error_count);
    renderKeyValueList(els.modalMistakesByCharacter, payload.mistakes_by_character || {});
    renderKeyValueList(els.modalWeakWords, payload.weak_words || {});
    renderKeyValueList(els.modalWeakSequences, payload.weak_sequences || payload.weak_bigrams || {});
    renderSimpleList(els.modalSuggestedFocus, payload.suggested_focus || []);
    openSessionModal();
  } catch (error) {
    console.error("Erreur détail session:", error);
    alert("Impossible de charger le détail de la session.");
  }
}

function bindEvents() {
  els.filterAllBtn.addEventListener("click", () => setFilter("all"));
  els.filterSessionsBtn.addEventListener("click", () => setFilter("sessions"));
  els.filterSeriesBtn.addEventListener("click", () => setFilter("series"));
  els.filterAdaptiveBtn.addEventListener("click", () => setFilter("adaptive"));
  els.searchInput.addEventListener("input", () => {
    state.page = 1;
    renderHistoryPage();
  });
  els.refreshBtn.addEventListener("click", loadResultsHistory);
  els.historyPrevBtn.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      renderHistoryPage();
    }
  });
  els.historyNextBtn.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredEntries().length / state.pageSize));
    if (state.page < totalPages) {
      state.page += 1;
      renderHistoryPage();
    }
  });
  els.closeSessionModalBtn.addEventListener("click", closeSessionModal);
  els.sessionModalBackdrop.addEventListener("click", closeSessionModal);
}

function init() {
  initTheme();
  bindEvents();
  setFilter("all");
  loadResultsHistory();
}

init();
