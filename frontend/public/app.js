const API_BASE_URL = "http://localhost:8000";

const state = {
  theme: localStorage.getItem("typing-theme") || "light",
  exerciseMode: "text",
  exercises: [],
  selectedExercise: null,
  currentSessionId: null,
  currentReferenceText: "",
  timerInterval: null,
  sessionStartedAt: null,
  lockedErrorIndex: null,
  errorPositions: new Set(),
  typedHistory: []
};

const els = {
  themeToggle: document.getElementById("theme-toggle"),
  themeLabel: document.getElementById("theme-label"),

  tabText: document.getElementById("tab-text"),
  tabWordList: document.getElementById("tab-word-list"),
  textForm: document.getElementById("text-form"),
  wordListForm: document.getElementById("word-list-form"),

  textExerciseContent: document.getElementById("text-exercise-content"),
  textExerciseLanguage: document.getElementById("text-exercise-language"),
  textExerciseDifficulty: document.getElementById("text-exercise-difficulty"),
  createTextExerciseBtn: document.getElementById("create-text-exercise-btn"),

  wordListContent: document.getElementById("word-list-content"),
  wordListLanguage: document.getElementById("word-list-language"),
  wordListDifficulty: document.getElementById("word-list-difficulty"),
  createWordListExerciseBtn: document.getElementById("create-word-list-exercise-btn"),

  userName: document.getElementById("user-name"),
  exerciseSelect: document.getElementById("exercise-select"),
  wordCountField: document.getElementById("word-count-field"),
  wordCountSelect: document.getElementById("word-count-select"),
  refreshExercisesBtn: document.getElementById("refresh-exercises-btn"),
  startSessionBtn: document.getElementById("start-session-btn"),
  resetSessionBtn: document.getElementById("reset-session-btn"),

  sessionIdLabel: document.getElementById("session-id-label"),
  timerLabel: document.getElementById("timer-label"),
  referenceTextRender: document.getElementById("reference-text-render"),
  typingInput: document.getElementById("typing-input"),

  liveCharCount: document.getElementById("live-char-count"),
  liveProgress: document.getElementById("live-progress"),
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }

  return response.json();
}

function setExerciseMode(mode) {
  state.exerciseMode = mode;

  els.tabText.classList.toggle("active", mode === "text");
  els.tabWordList.classList.toggle("active", mode === "word_list");

  els.textForm.classList.toggle("hidden", mode !== "text");
  els.wordListForm.classList.toggle("hidden", mode !== "word_list");
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

function resetTypingState() {
  state.currentSessionId = null;
  state.currentReferenceText = "";
  state.lockedErrorIndex = null;
  state.errorPositions = new Set();
  state.typedHistory = [];

  stopTimer();

  els.sessionIdLabel.textContent = "—";
  els.timerLabel.textContent = "0.0 s";
  els.typingInput.value = "";
  els.typingInput.disabled = true;
  els.referenceTextRender.innerHTML = '<span class="empty-state">Lance une session pour commencer.</span>';

  updateLiveMetrics();
  resetResultsView();
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function startTimer() {
  stopTimer();
  state.sessionStartedAt = new Date();

  state.timerInterval = setInterval(() => {
    els.timerLabel.textContent = `${formatNumber(secondsSince(state.sessionStartedAt))} s`;
  }, 100);
}

function currentProgressIndex() {
  return state.typedHistory.length;
}

function currentErrorCount() {
  return state.errorPositions.size;
}

function updateLiveMetrics() {
  const progress = state.currentReferenceText.length
    ? Math.floor((currentProgressIndex() / state.currentReferenceText.length) * 100)
    : 0;

  els.liveCharCount.textContent = String(currentProgressIndex());
  els.liveProgress.textContent = `${progress}%`;
  els.liveErrorCount.textContent = String(currentErrorCount());
}

function renderReferenceText() {
  const reference = state.currentReferenceText;

  if (!reference) {
    els.referenceTextRender.innerHTML = '<span class="empty-state">Lance une session pour commencer.</span>';
    return;
  }

  const progress = currentProgressIndex();
  const locked = state.lockedErrorIndex;

  const html = reference
    .split("")
    .map((char, index) => {
      let cls = "char pending";

      if (index < progress) {
        cls = "char correct";
      }

      if (locked !== null && index === locked) {
        cls = "char error";
      } else if (index === progress && locked === null) {
        cls = "char current";
      }

      const safeChar = char === " " ? "&nbsp;" : escapeHtml(char);
      return `<span class="${cls}">${safeChar}</span>`;
    })
    .join("");

  els.referenceTextRender.innerHTML = html;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    const typeLabel = exercise.exercise_type === "word_list" ? "liste de mots" : "texte";
    option.textContent = `#${exercise.id} · ${typeLabel} · ${exercise.language.toUpperCase()} · ${exercise.difficulty}`;
    els.exerciseSelect.appendChild(option);
  });
}

function updateWordCountVisibility() {
  const selectedId = Number(els.exerciseSelect.value);
  const exercise = state.exercises.find((item) => item.id === selectedId) || null;
  state.selectedExercise = exercise;

  const show = exercise?.exercise_type === "word_list";
  els.wordCountField.classList.toggle("hidden", !show);
}

async function loadExercises() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/exercises`);
    state.exercises = Array.isArray(data) ? data : [data];
    renderExerciseOptions();
    updateWordCountVisibility();
  } catch (error) {
    console.error("Erreur chargement exercices:", error);
  }
}

async function createTextExercise() {
  const content = els.textExerciseContent.value.trim();
  if (!content) {
    alert("Ajoute un texte.");
    return;
  }

  try {
    await fetchJson(`${API_BASE_URL}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_type: "text",
        language: els.textExerciseLanguage.value,
        content,
        difficulty: els.textExerciseDifficulty.value
      })
    });

    els.textExerciseContent.value = "";
    await loadExercises();
  } catch (error) {
    console.error(error);
    alert("Impossible de créer l'exercice texte.");
  }
}

async function createWordListExercise() {
  const content = els.wordListContent.value.trim();
  if (!content) {
    alert("Ajoute une liste de mots.");
    return;
  }

  try {
    await fetchJson(`${API_BASE_URL}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_type: "word_list",
        language: els.wordListLanguage.value,
        content,
        difficulty: els.wordListDifficulty.value
      })
    });

    els.wordListContent.value = "";
    await loadExercises();
  } catch (error) {
    console.error(error);
    alert("Impossible de créer la liste de mots.");
  }
}

async function startSession() {
  const selectedId = Number(els.exerciseSelect.value);
  const exercise = state.exercises.find((item) => item.id === selectedId);

  if (!exercise) {
    alert("Choisis un exercice.");
    return;
  }

  try {
    const body = {
      exercise_id: exercise.id,
      user_name: els.userName.value.trim() || null
    };

    if (exercise.exercise_type === "word_list") {
      body.word_count = Number(els.wordCountSelect.value);
    }

    const session = await fetchJson(`${API_BASE_URL}/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    state.selectedExercise = exercise;
    state.currentSessionId = session.id;
    state.currentReferenceText = session.reference_text;
    state.lockedErrorIndex = null;
    state.errorPositions = new Set();
    state.typedHistory = [];

    els.sessionIdLabel.textContent = String(session.id);
    els.typingInput.disabled = false;
    els.typingInput.value = "";
    els.typingInput.focus();

    renderReferenceText();
    updateLiveMetrics();
    resetResultsView();
    startTimer();
  } catch (error) {
    console.error(error);
    alert(`Impossible de démarrer la session : ${error.message}`);
  }
}

function finishSessionAutomatically() {
  const typedText = state.typedHistory.join("");
  const durationSeconds = Math.max(secondsSince(state.sessionStartedAt), 0.1);
  const errorCount = currentErrorCount();

  completeSession(typedText, durationSeconds, errorCount);
}

async function completeSession(typedText, durationSeconds, errorCount) {
  if (!state.currentSessionId) return;

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
    els.typingInput.disabled = true;

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

function processTypingInput() {
  if (!state.currentReferenceText || !state.currentSessionId) return;

  let rawInput = els.typingInput.value;
  const progress = currentProgressIndex();
  const expectedChar = state.currentReferenceText[progress];

  if (state.lockedErrorIndex !== null) {
    if (!rawInput.length) {
      state.lockedErrorIndex = null;
      els.typingInput.value = "";
      renderReferenceText();
      return;
    }

    if (rawInput[0] === expectedChar) {
      state.typedHistory.push(expectedChar);
      els.typingInput.value = "";
      state.lockedErrorIndex = null;
      renderReferenceText();
      updateLiveMetrics();

      if (currentProgressIndex() >= state.currentReferenceText.length) {
        finishSessionAutomatically();
      }
    } else {
      els.typingInput.value = "";
    }

    return;
  }

  if (!rawInput.length) return;

  const typedChar = rawInput[0];
  els.typingInput.value = "";

  if (typedChar === expectedChar) {
    state.typedHistory.push(typedChar);
  } else {
    state.errorPositions.add(progress);
    state.lockedErrorIndex = progress;
  }

  renderReferenceText();
  updateLiveMetrics();

  if (state.lockedErrorIndex === null && currentProgressIndex() >= state.currentReferenceText.length) {
    finishSessionAutomatically();
  }
}

function renderKeyValueList(container, entries) {
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
    val.textContent = String(value);

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

function bindEvents() {
  els.themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  els.tabText.addEventListener("click", () => setExerciseMode("text"));
  els.tabWordList.addEventListener("click", () => setExerciseMode("word_list"));

  els.createTextExerciseBtn.addEventListener("click", createTextExercise);
  els.createWordListExerciseBtn.addEventListener("click", createWordListExercise);

  els.exerciseSelect.addEventListener("change", updateWordCountVisibility);
  els.refreshExercisesBtn.addEventListener("click", loadExercises);
  els.startSessionBtn.addEventListener("click", startSession);
  els.resetSessionBtn.addEventListener("click", resetTypingState);
  els.refreshResultsBtn.addEventListener("click", loadResultsHistory);

  els.typingInput.addEventListener("input", processTypingInput);
  els.typingInput.addEventListener("paste", (event) => event.preventDefault());
}

async function init() {
  applyTheme(state.theme);
  bindEvents();
  renderReferenceText();
  updateLiveMetrics();
  await loadExercises();
  await loadResultsHistory();
}

init();