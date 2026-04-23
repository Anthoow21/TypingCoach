const API_BASE_URL = "http://localhost:8000";

const state = {
  exercises: [],
  selectedExercise: null,
  currentSessionId: null,
  sessionStartedAt: null,
  timerInterval: null,
  theme: localStorage.getItem("typing-theme") || "dark"
};

const els = {
  backendStatus: document.getElementById("backend-status"),
  analysisStatus: document.getElementById("analysis-status"),
  themeToggle: document.getElementById("theme-toggle"),
  themeLabel: document.getElementById("theme-label"),

  exerciseSelect: document.getElementById("exercise-select"),
  refreshExercisesBtn: document.getElementById("refresh-exercises-btn"),
  createExerciseBtn: document.getElementById("create-exercise-btn"),
  startSessionBtn: document.getElementById("start-session-btn"),

  userName: document.getElementById("user-name"),
  newExerciseContent: document.getElementById("new-exercise-content"),
  newExerciseLanguage: document.getElementById("new-exercise-language"),
  newExerciseDifficulty: document.getElementById("new-exercise-difficulty"),

  referenceText: document.getElementById("reference-text"),
  typedText: document.getElementById("typed-text"),
  completeSessionBtn: document.getElementById("complete-session-btn"),
  resetSessionBtn: document.getElementById("reset-session-btn"),

  timerLabel: document.getElementById("timer-label"),
  sessionIdLabel: document.getElementById("session-id-label"),
  liveCharCount: document.getElementById("live-char-count"),
  liveWordCount: document.getElementById("live-word-count"),
  liveErrorCount: document.getElementById("live-error-count"),

  resultWpm: document.getElementById("result-wpm"),
  resultAccuracy: document.getElementById("result-accuracy"),
  resultErrors: document.getElementById("result-errors"),

  mistakesByCharacter: document.getElementById("mistakes-by-character"),
  weakWords: document.getElementById("weak-words"),
  weakBigrams: document.getElementById("weak-bigrams"),
  suggestedFocus: document.getElementById("suggested-focus"),

  resultsHistory: document.getElementById("results-history"),
  refreshResultsBtn: document.getElementById("refresh-results-btn")
};

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  state.theme = theme;
  localStorage.setItem("typing-theme", theme);
  els.themeLabel.textContent = theme === "dark" ? "Mode clair" : "Mode sombre";
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value));
}

function secondsSince(startDate) {
  if (!startDate) return 0;
  return (Date.now() - startDate.getTime()) / 1000;
}

function estimateErrors(referenceText, typedText) {
  const maxLength = Math.max(referenceText.length, typedText.length);
  let errors = 0;

  for (let i = 0; i < maxLength; i += 1) {
    if ((referenceText[i] || "") !== (typedText[i] || "")) {
      errors += 1;
    }
  }

  return errors;
}

function updateLiveMetrics() {
  const typed = els.typedText.value;
  const reference = state.selectedExercise?.content || "";

  els.liveCharCount.textContent = String(typed.length);
  els.liveWordCount.textContent = String(
    typed.trim() ? typed.trim().split(/\s+/).length : 0
  );
  els.liveErrorCount.textContent = String(estimateErrors(reference, typed));
}

function setStatus(el, type, label) {
  el.className = `status-pill ${type}`;
  el.textContent = label;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

async function loadHealth() {
  try {
    const backend = await fetchJson(`${API_BASE_URL}/health`);
    setStatus(els.backendStatus, backend.status === "ok" ? "success" : "pending", backend.status);
  } catch {
    setStatus(els.backendStatus, "error", "Erreur");
  }

  try {
    const analysis = await fetchJson(`${API_BASE_URL}/analysis/health`);
    const ok = analysis.analysis?.status === "ok";
    setStatus(els.analysisStatus, ok ? "success" : "pending", ok ? "OK" : "Inconnu");
  } catch {
    setStatus(els.analysisStatus, "error", "Erreur");
  }
}

function renderExerciseOptions() {
  els.exerciseSelect.innerHTML = "";

  if (!state.exercises.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Aucun exercice";
    els.exerciseSelect.appendChild(option);
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choisir un exercice";
  els.exerciseSelect.appendChild(placeholder);

  state.exercises.forEach((exercise) => {
    const option = document.createElement("option");
    option.value = String(exercise.id);
    option.textContent = `#${exercise.id} · ${exercise.language.toUpperCase()} · ${exercise.difficulty} · ${exercise.content.slice(0, 42)}`;
    els.exerciseSelect.appendChild(option);
  });
}

async function loadExercises() {
  try {
    const exercises = await fetchJson(`${API_BASE_URL}/exercises`);
    state.exercises = Array.isArray(exercises) ? exercises : [exercises];
    renderExerciseOptions();
  } catch (error) {
    console.error("Erreur chargement exercices:", error);
  }
}

function selectExerciseById(exerciseId) {
  state.selectedExercise = state.exercises.find((exercise) => exercise.id === Number(exerciseId)) || null;
  els.referenceText.textContent = state.selectedExercise
    ? state.selectedExercise.content
    : "Sélectionne ou crée un exercice pour commencer.";
  updateLiveMetrics();
}

async function createExercise() {
  const content = els.newExerciseContent.value.trim();
  const language = els.newExerciseLanguage.value;
  const difficulty = els.newExerciseDifficulty.value;

  if (!content) {
    alert("Ajoute un texte avant de créer un exercice.");
    return;
  }

  try {
    const exercise = await fetchJson(`${API_BASE_URL}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, content, difficulty })
    });

    els.newExerciseContent.value = "";
    await loadExercises();
    els.exerciseSelect.value = String(exercise.id);
    selectExerciseById(exercise.id);
  } catch (error) {
    console.error(error);
    alert("Impossible de créer l'exercice.");
  }
}

function startTimer() {
  stopTimer();
  state.sessionStartedAt = new Date();

  state.timerInterval = window.setInterval(() => {
    const elapsed = secondsSince(state.sessionStartedAt);
    els.timerLabel.textContent = `${formatNumber(elapsed)} s`;
  }, 100);
}

function stopTimer() {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

async function startSession() {
  if (!state.selectedExercise) {
    alert("Choisis d'abord un exercice.");
    return;
  }

  const userName = els.userName.value.trim() || null;

  try {
    const session = await fetchJson(`${API_BASE_URL}/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: state.selectedExercise.id,
        user_name: userName
      })
    });

    state.currentSessionId = session.id;
    els.sessionIdLabel.textContent = String(session.id);
    els.typedText.disabled = false;
    els.typedText.value = "";
    els.typedText.focus();
    els.completeSessionBtn.disabled = false;
    resetResultsView();
    updateLiveMetrics();
    startTimer();
  } catch (error) {
    console.error(error);
    alert("Impossible de démarrer la session.");
  }
}

function renderKeyValueList(container, entries, formatter = null) {
  container.innerHTML = "";

  if (!entries || !Object.keys(entries).length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "Aucune donnée.";
    container.appendChild(li);
    return;
  }

  Object.entries(entries).forEach(([key, value]) => {
    const li = document.createElement("li");

    const label = document.createElement("span");
    label.textContent = key;

    const val = document.createElement("strong");
    val.textContent = formatter ? formatter(value) : String(value);

    li.appendChild(label);
    li.appendChild(val);
    container.appendChild(li);
  });
}

function renderSimpleList(container, values) {
  container.innerHTML = "";

  if (!values || !values.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "Aucune donnée.";
    container.appendChild(li);
    return;
  }

  values.forEach((value) => {
    const li = document.createElement("li");
    li.textContent = value;
    container.appendChild(li);
  });
}

function resetResultsView() {
  els.resultWpm.textContent = "—";
  els.resultAccuracy.textContent = "—";
  els.resultErrors.textContent = "—";
  renderKeyValueList(els.mistakesByCharacter, {});
  renderKeyValueList(els.weakWords, {});
  renderKeyValueList(els.weakBigrams, {});
  renderSimpleList(els.suggestedFocus, []);
}

async function completeSession() {
  if (!state.currentSessionId || !state.selectedExercise) {
    alert("Aucune session active.");
    return;
  }

  const typedText = els.typedText.value;
  const durationSeconds = Math.max(secondsSince(state.sessionStartedAt), 0.1);
  const errorCount = estimateErrors(state.selectedExercise.content, typedText);

  try {
    const result = await fetchJson(`${API_BASE_URL}/sessions/${state.currentSessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typed_text: typedText,
        duration_seconds: durationSeconds,
        error_count: errorCount
      })
    });

    stopTimer();
    els.typedText.disabled = true;
    els.completeSessionBtn.disabled = true;

    els.resultWpm.textContent = formatNumber(result.wpm);
    els.resultAccuracy.textContent = `${formatNumber(result.accuracy)} %`;
    els.resultErrors.textContent = String(result.error_count);

    await loadDetailedAnalysis(state.currentSessionId);
    await loadResultsHistory();
  } catch (error) {
    console.error(error);
    alert("Impossible de terminer la session.");
  }
}

async function loadDetailedAnalysis(sessionId) {
  try {
    const analysis = await fetchJson(`${API_BASE_URL}/analyses/session/${sessionId}`);
    const payload = analysis.analysis_payload || {};

    renderKeyValueList(els.mistakesByCharacter, payload.mistakes_by_character || {});
    renderKeyValueList(els.weakWords, payload.weak_words || {});
    renderKeyValueList(els.weakBigrams, payload.weak_bigrams || {});
    renderSimpleList(els.suggestedFocus, payload.suggested_focus || []);
  } catch (error) {
    console.error("Erreur analyse détaillée:", error);
  }
}

async function loadResultsHistory() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/results`);
    const results = Array.isArray(data) ? data : [data];

    els.resultsHistory.innerHTML = "";

    if (!results.length) {
      els.resultsHistory.innerHTML = '<p class="empty-state">Aucun résultat pour le moment.</p>';
      return;
    }

    results
      .slice()
      .reverse()
      .forEach((result) => {
        const item = document.createElement("article");
        item.className = "history-item";

        const main = document.createElement("div");
        main.className = "history-main";
        main.innerHTML = `
          <strong>Session #${result.session_id}</strong>
          <span>${new Date(result.created_at).toLocaleString("fr-FR")}</span>
        `;

        const wpm = document.createElement("div");
        wpm.className = "history-cell";
        wpm.textContent = `WPM · ${formatNumber(result.wpm)}`;

        const accuracy = document.createElement("div");
        accuracy.className = "history-cell";
        accuracy.textContent = `Accuracy · ${formatNumber(result.accuracy)} %`;

        const errors = document.createElement("div");
        errors.className = "history-cell";
        errors.textContent = `Errors · ${result.error_count}`;

        item.append(main, wpm, accuracy, errors);
        els.resultsHistory.appendChild(item);
      });
  } catch (error) {
    console.error("Erreur chargement résultats:", error);
  }
}

function resetSession() {
  stopTimer();
  state.currentSessionId = null;
  state.sessionStartedAt = null;
  els.sessionIdLabel.textContent = "—";
  els.timerLabel.textContent = "0.0 s";
  els.typedText.value = "";
  els.typedText.disabled = true;
  els.completeSessionBtn.disabled = true;
  updateLiveMetrics();
}

function bindEvents() {
  els.themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  els.exerciseSelect.addEventListener("change", (event) => {
    selectExerciseById(event.target.value);
  });

  els.refreshExercisesBtn.addEventListener("click", loadExercises);
  els.createExerciseBtn.addEventListener("click", createExercise);
  els.startSessionBtn.addEventListener("click", startSession);
  els.completeSessionBtn.addEventListener("click", completeSession);
  els.resetSessionBtn.addEventListener("click", resetSession);
  els.refreshResultsBtn.addEventListener("click", loadResultsHistory);

  els.typedText.addEventListener("input", updateLiveMetrics);
}

async function init() {
  applyTheme(state.theme);
  bindEvents();
  await loadHealth();
  await loadExercises();
  await loadResultsHistory();
}

init();