const API_BASE_URL = "http://localhost:8000";

const state = {
  theme: localStorage.getItem("typing-theme") || "light",
  exerciseMode: "text",
  practiceMode: "single",
  exercises: [],
  selectedExercise: null,
  currentSessionId: null,
  currentReferenceText: "",
  timerInterval: null,
  sessionStartedAt: null,
  lockedErrorIndex: null,
  lockedMistypedChar: null,
  errorPositions: new Set(),
  typedHistory: [],
  errorEvents: [],
  currentSeriesId: null,
  isSeriesPlaying: false,
  currentSeriesSessions: [],
  currentSeriesIndex: 0,
  timerStarted: false,
  historyEntries: [],
  historyPage: 1,
  historyPageSize: 5,
};

const els = {
  themeToggle: document.getElementById("theme-toggle"),
  themeLabel: document.getElementById("theme-label"),

  tabText: document.getElementById("tab-text"),
  tabWordList: document.getElementById("tab-word-list"),
  textForm: document.getElementById("text-form"),
  wordListForm: document.getElementById("word-list-form"),

  textExerciseTitle: document.getElementById("text-exercise-title"),
  textExerciseContent: document.getElementById("text-exercise-content"),
  textExerciseLanguage: document.getElementById("text-exercise-language"),
  textExerciseDifficulty: document.getElementById("text-exercise-difficulty"),
  createTextExerciseBtn: document.getElementById("create-text-exercise-btn"),

  wordListTitle: document.getElementById("word-list-title"),
  wordListContent: document.getElementById("word-list-content"),
  wordListLanguage: document.getElementById("word-list-language"),
  wordListDifficulty: document.getElementById("word-list-difficulty"),
  createWordListExerciseBtn: document.getElementById("create-word-list-exercise-btn"),

  modeSingleTab: document.getElementById("mode-single-tab"),
  modeSeriesTab: document.getElementById("mode-series-tab"),
  singlePracticePanel: document.getElementById("single-practice-panel"),
  seriesPracticePanel: document.getElementById("series-practice-panel"),

  userName: document.getElementById("user-name"),
  exerciseSelect: document.getElementById("exercise-select"),
  wordCountField: document.getElementById("word-count-field"),
  wordCountSelect: document.getElementById("word-count-select"),
  refreshExercisesBtn: document.getElementById("refresh-exercises-btn"),
  randomSessionBtn: document.getElementById("random-session-btn"),
  startSessionBtn: document.getElementById("start-session-btn"),
  resetSessionBtn: document.getElementById("reset-session-btn"),

  seriesUserName: document.getElementById("series-user-name"),
  seriesCountSelect: document.getElementById("series-count-select"),
  startSeriesBtn: document.getElementById("start-series-btn"),
  loadSeriesSummaryBtn: document.getElementById("load-series-summary-btn"),
  seriesIdInput: document.getElementById("series-id-input"),
  seriesIdLabel: document.getElementById("series-id-label"),
  seriesStatusLabel: document.getElementById("series-status-label"),
  seriesSessionsList: document.getElementById("series-sessions-list"),

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

  seriesCompletedSessions: document.getElementById("series-completed-sessions"),
  seriesAverageWpm: document.getElementById("series-average-wpm"),
  seriesAverageAccuracy: document.getElementById("series-average-accuracy"),
  seriesTopCharacters: document.getElementById("series-top-characters"),
  seriesTopWords: document.getElementById("series-top-words"),
  seriesTopBigrams: document.getElementById("series-top-bigrams"),
  seriesTotalErrors: document.getElementById("series-total-errors"),

  seriesProgressBox: document.getElementById("series-progress-box"),
  seriesPlayIdLabel: document.getElementById("series-play-id-label"),
  seriesPlayProgressLabel: document.getElementById("series-play-progress-label"),
  seriesCurrentSessionLabel: document.getElementById("series-current-session-label"),
  seriesCurrentExerciseLabel: document.getElementById("series-current-exercise-label"),
  seriesCurrentStatusLabel: document.getElementById("series-current-status-label"),

  resultsHistory: document.getElementById("results-history"),
  refreshResultsBtn: document.getElementById("refresh-results-btn"),

  sessionModal: document.getElementById("session-modal"),
  sessionModalBackdrop: document.getElementById("session-modal-backdrop"),
  closeSessionModalBtn: document.getElementById("close-session-modal-btn"),
  modalSessionTitle: document.getElementById("modal-session-title"),
  modalWpm: document.getElementById("modal-wpm"),
  modalAccuracy: document.getElementById("modal-accuracy"),
  modalErrors: document.getElementById("modal-errors"),
  modalMistakesByCharacter: document.getElementById("modal-mistakes-by-character"),
  modalWeakWords: document.getElementById("modal-weak-words"),
  modalWeakBigrams: document.getElementById("modal-weak-bigrams"),
  modalSuggestedFocus: document.getElementById("modal-suggested-focus"),

  seriesModeText: document.getElementById("series-mode-text"),
  seriesModeWordList: document.getElementById("series-mode-word-list"),
  seriesWordCountsField: document.getElementById("series-word-counts-field"),

  resultReplayText: document.getElementById("result-replay-text"),

  historyPagination: document.getElementById("history-pagination"),
  historyPrevBtn: document.getElementById("history-prev-btn"),
  historyNextBtn: document.getElementById("history-next-btn"),
  historyPageLabel: document.getElementById("history-page-label"),
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

function setPracticeMode(mode) {
  state.practiceMode = mode;
  els.modeSingleTab.classList.toggle("active", mode === "single");
  els.modeSeriesTab.classList.toggle("active", mode === "series");
  els.singlePracticePanel.classList.toggle("hidden", mode !== "single");
  els.seriesPracticePanel.classList.toggle("hidden", mode !== "series");
}

function resetResultsView() {
  els.resultWpm.textContent = "—";
  els.resultAccuracy.textContent = "—";
  els.resultErrors.textContent = "—";
  els.resultReplayText.innerHTML = '<span class="empty-state">Le texte annoté apparaîtra ici après la session.</span>';
  renderKeyValueList(els.mistakesByCharacter, {});
  renderKeyValueList(els.weakWords, {});
  renderKeyValueList(els.weakBigrams, {});
  renderSimpleList(els.suggestedFocus, []);
}

function resetSeriesSummaryView() {
  els.seriesCompletedSessions.textContent = "—";
  els.seriesAverageWpm.textContent = "—";
  els.seriesAverageAccuracy.textContent = "—";
  els.seriesTotalErrors.textContent = "—";
  renderPairList(els.seriesTopCharacters, []);
  renderPairList(els.seriesTopWords, []);
  renderPairList(els.seriesTopBigrams, []);
}
function resetSeriesPlayState() {
  state.isSeriesPlaying = false;
  state.currentSeriesSessions = [];
  state.currentSeriesIndex = 0;

  els.seriesProgressBox.classList.add("hidden");
  els.seriesPlayIdLabel.textContent = "—";
  els.seriesPlayProgressLabel.textContent = "0 / 0";
  els.seriesCurrentSessionLabel.textContent = "—";
  els.seriesCurrentExerciseLabel.textContent = "—";
  els.seriesCurrentStatusLabel.textContent = "—";
}

function updateSeriesProgressUI() {
  if (!state.isSeriesPlaying || !state.currentSeriesSessions.length) {
    els.seriesProgressBox.classList.add("hidden");
    return;
  }

  const currentSession = state.currentSeriesSessions[state.currentSeriesIndex];
  const total = state.currentSeriesSessions.length;
  const current = state.currentSeriesIndex + 1;

  els.seriesProgressBox.classList.remove("hidden");
  els.seriesPlayIdLabel.textContent = String(state.currentSeriesId || "—");
  els.seriesPlayProgressLabel.textContent = `${current} / ${total}`;
  els.seriesCurrentSessionLabel.textContent = currentSession ? `#${currentSession.id}` : "—";
  els.seriesCurrentExerciseLabel.textContent = currentSession ? `#${currentSession.exercise_id}` : "—";
  els.seriesCurrentStatusLabel.textContent = currentSession ? currentSession.status : "—";
}

function loadSessionIntoPlayer(session) {
  state.currentSessionId = session.id;
  state.currentReferenceText = session.reference_text;
  state.lockedErrorIndex = null;
  state.lockedMistypedChar = null;
  state.errorPositions = new Set();
  state.typedHistory = [];
  state.errorEvents = [];

  els.sessionIdLabel.textContent = String(session.id);
  syncTypingInputValue();
  els.typingInput.disabled = false;
  els.typingInput.focus();

  state.timerStarted = false;
  state.sessionStartedAt = null;
  els.timerLabel.textContent = "0.0 s";

  renderReferenceText();
  updateLiveMetrics();
  resetResultsView();
  updateSeriesProgressUI();
}

function resetTypingState() {
  state.currentSessionId = null;
  state.currentReferenceText = "";
  state.lockedErrorIndex = null;
  state.lockedMistypedChar = null;
  state.errorPositions = new Set();
  state.typedHistory = [];
  state.errorEvents = [];
  state.timerStarted = false;
  state.sessionStartedAt = null;

  stopTimer();

  els.sessionIdLabel.textContent = "—";
  els.timerLabel.textContent = "0.0 s";
  els.typingInput.value = "";
  els.typingInput.disabled = true;
  els.referenceTextRender.innerHTML = '<span class="empty-state">Lance une session pour commencer.</span>';

  updateLiveMetrics();
  resetResultsView();
  resetSeriesPlayState();
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
    ? Math.floor((currentProgressIndex() / Array.from(state.currentReferenceText).length) * 100)
    : 0;

  els.liveCharCount.textContent = String(currentProgressIndex());
  els.liveProgress.textContent = `${progress}%`;
  els.liveErrorCount.textContent = String(currentErrorCount());
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderReferenceText() {
  const referenceChars = Array.from(state.currentReferenceText);

  if (!referenceChars.length) {
    els.referenceTextRender.innerHTML = '<span class="empty-state">Lance une session pour commencer.</span>';
    return;
  }

  const progress = currentProgressIndex();
  const locked = state.lockedErrorIndex;

  const words = [];
  let currentWord = [];

  referenceChars.forEach((char, index) => {
    if (char === " ") {
      if (currentWord.length) {
        words.push({ type: "word", chars: currentWord });
        currentWord = [];
      }

      words.push({
        type: "space",
        chars: [{ char: " ", index }]
      });
    } else {
      currentWord.push({ char, index });
    }
  });

  if (currentWord.length) {
    words.push({ type: "word", chars: currentWord });
  }

  const html = words
    .map((token) => {
      const charsHtml = token.chars
        .map(({ char, index }) => {
          let cls = "char pending";

          if (index < progress) {
            cls = "char correct";
          }

          if (locked !== null && index === locked) {
            cls = "char error";
          } else if (index === progress && locked === null) {
            cls = "char current";
          }

          const isSpace = char === " ";
          const safeChar = isSpace ? "&nbsp;" : escapeHtml(char);
          const extraClass = isSpace ? " space" : "";

          return `<span class="${cls}${extraClass}" data-index="${index}">${safeChar}</span>`;
        })
        .join("");

      if (token.type === "space") {
        return `<span class="word space-word">${charsHtml}</span>`;
      }

      return `<span class="word">${charsHtml}</span>`;
    })
    .join("");

  els.referenceTextRender.innerHTML = html;
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
    option.textContent = `${exercise.title} · ${typeLabel} · ${exercise.language.toUpperCase()} · ${exercise.difficulty}`;
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
  const title = els.textExerciseTitle.value.trim();
  const content = els.textExerciseContent.value.trim();

  if (!title) {
    alert("Ajoute un titre.");
    return;
  }

  if (!content) {
    alert("Ajoute un texte.");
    return;
  }

  try {
    await fetchJson(`${API_BASE_URL}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        exercise_type: "text",
        language: els.textExerciseLanguage.value,
        content,
        difficulty: els.textExerciseDifficulty.value
      })
    });

    els.textExerciseTitle.value = "";
    els.textExerciseContent.value = "";
    await loadExercises();
  } catch (error) {
    console.error(error);
    alert("Impossible de créer l'exercice texte.");
  }
}

async function createWordListExercise() {
  const title = els.wordListTitle.value.trim();
  const content = els.wordListContent.value.trim();

  if (!title) {
    alert("Ajoute un titre.");
    return;
  }

  if (!content) {
    alert("Ajoute une liste de mots.");
    return;
  }

  try {
    await fetchJson(`${API_BASE_URL}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        exercise_type: "word_list",
        language: els.wordListLanguage.value,
        content,
        difficulty: els.wordListDifficulty.value
      })
    });

    els.wordListTitle.value = "";
    els.wordListContent.value = "";
    await loadExercises();
  } catch (error) {
    console.error(error);
    alert("Impossible de créer la liste de mots.");
  }
}

function syncTypingInputValue() {
  const validated = state.typedHistory.join("");
  const wrongPart = state.lockedMistypedChar || "";
  els.typingInput.value = validated + wrongPart;
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
    state.lockedMistypedChar = null;
    state.errorPositions = new Set();
    state.typedHistory = [];
    state.errorEvents = [];

    els.sessionIdLabel.textContent = String(session.id);
    syncTypingInputValue();
    els.typingInput.disabled = false;
    els.typingInput.focus();

    state.timerStarted = false;
    state.sessionStartedAt = null;
    els.timerLabel.textContent = "0.0 s";

    renderReferenceText();
    updateLiveMetrics();
    resetResultsView();
  } catch (error) {
    console.error(error);
    alert(`Impossible de démarrer la session : ${error.message}`);
  }
}

async function startRandomSession() {
  if (!state.exercises.length) {
    alert("Aucun exercice disponible.");
    return;
  }

  const randomExercise = state.exercises[Math.floor(Math.random() * state.exercises.length)];
  els.exerciseSelect.value = String(randomExercise.id);
  updateWordCountVisibility();

  if (randomExercise.exercise_type === "word_list") {
    const possibleCounts = [25, 40, 50, 75, 100];
    const randomCount = possibleCounts[Math.floor(Math.random() * possibleCounts.length)];
    els.wordCountSelect.value = String(randomCount);
  }

  await startSession();
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
        error_count: errorCount,
        error_events: state.errorEvents
      })
    });

    stopTimer();
    els.typingInput.disabled = true;

    els.resultWpm.textContent = formatNumber(result.wpm);
    els.resultAccuracy.textContent = `${formatNumber(result.accuracy)} %`;
    els.resultErrors.textContent = String(result.error_count);

    await loadDetailedAnalysis(state.currentSessionId);
    await loadResultsHistory();

    if (state.isSeriesPlaying) {
      await advanceToNextSeriesSession();
    }
  } catch (error) {
    console.error(error);
    alert("Impossible de terminer la session.");
  }
}

function processTypingKey(event) {
  if (!state.currentReferenceText || !state.currentSessionId) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const referenceChars = Array.from(state.currentReferenceText);
  const progress = currentProgressIndex();
  const expectedChar = referenceChars[progress];

  if (!expectedChar) return;
  if (event.key.length !== 1 && event.key !== "Backspace") return;

  if (!state.timerStarted && event.key !== "Backspace") {
    state.timerStarted = true;
    startTimer();
  }

  event.preventDefault();

  if (state.lockedErrorIndex !== null) {
    if (event.key === "Backspace") {
      state.lockedMistypedChar = null;
      syncTypingInputValue();
      renderReferenceText();
      return;
    }

    if (event.key === expectedChar) {
      state.typedHistory.push(expectedChar);
      state.lockedErrorIndex = null;
      state.lockedMistypedChar = null;
      syncTypingInputValue();
      renderReferenceText();
      updateLiveMetrics();

      if (currentProgressIndex() >= referenceChars.length) {
        finishSessionAutomatically();
      }
    }

    return;
  }

  if (event.key === "Backspace") return;

  if (event.key === expectedChar) {
    state.typedHistory.push(expectedChar);
  } else {
    state.errorPositions.add(progress);
    state.errorEvents.push({
      index: progress,
      expected_char: expectedChar,
      typed_char: event.key
    });
    state.lockedErrorIndex = progress;
    state.lockedMistypedChar = event.key;
  }

  syncTypingInputValue();
  renderReferenceText();
  updateLiveMetrics();

  if (state.lockedErrorIndex === null && currentProgressIndex() >= referenceChars.length) {
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

function renderPairList(container, entries) {
  container.innerHTML = "";

  if (!entries || !entries.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "Aucune donnée.";
    container.appendChild(li);
    return;
  }

  entries.forEach(([key, value]) => {
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

function renderResultReplay(referenceText, errorEvents) {
  if (!referenceText) {
    els.resultReplayText.innerHTML = '<span class="empty-state">Le texte annoté apparaîtra ici après la session.</span>';
    return;
  }

  const chars = Array.from(referenceText);
  const errorMap = new Map();

  (errorEvents || []).forEach((event) => {
    if (!errorMap.has(event.index)) {
      errorMap.set(event.index, event);
    }
  });

  const tokens = [];
  let currentWord = [];

  chars.forEach((char, index) => {
    if (char === " ") {
      if (currentWord.length) {
        tokens.push({ type: "word", chars: currentWord });
        currentWord = [];
      }
      tokens.push({
        type: "space",
        chars: [{ char: " ", index }]
      });
    } else {
      currentWord.push({ char, index });
    }
  });

  if (currentWord.length) {
    tokens.push({ type: "word", chars: currentWord });
  }

  const html = tokens
    .map((token) => {
      const charsHtml = token.chars
        .map(({ char, index }) => {
          const errorEvent = errorMap.get(index);
          const cls = errorEvent ? "replay-char corrected" : "replay-char clean";
          const isSpace = char === " ";
          const safeChar = isSpace ? "&nbsp;" : escapeHtml(char);
          const extraClass = isSpace ? " space" : "";

          const tooltip = errorEvent
            ? ` title="Attendu : ${escapeHtml(errorEvent.expected_char)} | Tapé : ${escapeHtml(errorEvent.typed_char)}"`
            : "";

          return `<span class="${cls}${extraClass}"${tooltip}>${safeChar}</span>`;
        })
        .join("");

      if (token.type === "space") {
        return `<span class="replay-word replay-space-word">${charsHtml}</span>`;
      }

      return `<span class="replay-word">${charsHtml}</span>`;
    })
    .join("");

  els.resultReplayText.innerHTML = html;
}

async function loadDetailedAnalysis(sessionId) {
  try {
    const analysis = await fetchJson(`${API_BASE_URL}/analyses/session/${sessionId}`);
    const payload = analysis.analysis_payload || {};

    renderKeyValueList(els.mistakesByCharacter, payload.mistakes_by_character || {});
    renderKeyValueList(els.weakWords, payload.weak_words || {});
    renderKeyValueList(els.weakBigrams, payload.weak_bigrams || {});
    renderSimpleList(els.suggestedFocus, payload.suggested_focus || []);
    renderResultReplay(
      payload.reference_text || state.currentReferenceText,
      payload.error_events || state.errorEvents
    );
  } catch (error) {
    console.error("Erreur analyse détaillée:", error);
  }
}

function createHistorySessionItem(result) {
  const item = document.createElement("article");
  item.className = "history-item";

  const button = document.createElement("button");
  button.className = "session-detail-button";
  button.type = "button";

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

  button.append(main, wpm, accuracy, errors);
  button.addEventListener("click", () => showSessionDetail(result.session_id));

  item.appendChild(button);
  return item;
}

function renderHistoryPage() {
  const entries = state.historyEntries || [];
  const pageSize = state.historyPageSize;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));

  if (state.historyPage > totalPages) {
    state.historyPage = totalPages;
  }

  const start = (state.historyPage - 1) * pageSize;
  const end = start + pageSize;
  const visibleEntries = entries.slice(start, end);

  els.resultsHistory.innerHTML = "";

  if (!entries.length) {
    els.resultsHistory.innerHTML = '<p class="empty-state">Aucun résultat pour le moment.</p>';
    els.historyPagination.classList.add("hidden");
    return;
  }

  visibleEntries.forEach((entry) => {
    els.resultsHistory.appendChild(entry);
  });

  if (entries.length <= pageSize) {
    els.historyPagination.classList.add("hidden");
  } else {
    els.historyPagination.classList.remove("hidden");
    els.historyPageLabel.textContent = `Page ${state.historyPage} / ${totalPages}`;
    els.historyPrevBtn.disabled = state.historyPage === 1;
    els.historyNextBtn.disabled = state.historyPage === totalPages;
  }
}

function goToPreviousHistoryPage() {
  if (state.historyPage > 1) {
    state.historyPage -= 1;
    renderHistoryPage();
  }
}

function goToNextHistoryPage() {
  const totalPages = Math.max(1, Math.ceil(state.historyEntries.length / state.historyPageSize));
  if (state.historyPage < totalPages) {
    state.historyPage += 1;
    renderHistoryPage();
  }
}

async function loadResultsHistory() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/results`);
    const results = Array.isArray(data) ? data : [data];

    const entries = [];

    if (!results.length) {
      state.historyEntries = [];
      state.historyPage = 1;
      renderHistoryPage();
      return;
    }

    const grouped = new Map();
    const standalone = [];

    results.slice().reverse().forEach((result) => {
      const seriesId = result.practice_series_id || null;

      if (!seriesId) {
        standalone.push(result);
        return;
      }

      if (!grouped.has(seriesId)) {
        grouped.set(seriesId, []);
      }
      grouped.get(seriesId).push(result);
    });

    standalone.forEach((result) => {
      const item = createHistorySessionItem(result);
      entries.push(item);
    });

    grouped.forEach((seriesResults, seriesId) => {
      const group = document.createElement("section");
      group.className = "series-history-group";

      const header = document.createElement("button");
      header.className = "series-history-header";
      header.type = "button";
      header.innerHTML = `
        <div class="history-main">
          <strong>Série #${seriesId}</strong>
          <span>${seriesResults.length} session(s)</span>
        </div>
        <div class="history-cell">Cliquer pour dérouler</div>
      `;

      const content = document.createElement("div");
      content.className = "series-history-content hidden";

      seriesResults.forEach((result) => {
        const item = createHistorySessionItem(result);
        content.appendChild(item);
      });

      header.addEventListener("click", () => {
        content.classList.toggle("hidden");
      });

      group.append(header, content);
      entries.push(group);
    });

    state.historyEntries = entries;
    state.historyPage = 1;
    renderHistoryPage();
  } catch (error) {
    console.error("Erreur chargement résultats:", error);
  }
}

function getSelectedSeriesModes() {
  const modes = [];

  if (els.seriesModeText.checked) {
    modes.push("text");
  }

  if (els.seriesModeWordList.checked) {
    modes.push("word_list");
  }

  return modes;
}

function getSelectedWordCounts() {
  return Array.from(document.querySelectorAll(".series-word-count-checkbox:checked"))
    .map((input) => Number(input.value));
}

function updateSeriesWordCountVisibility() {
  const show = els.seriesModeWordList.checked;
  els.seriesWordCountsField.classList.toggle("hidden", !show);
}

async function startPracticeSeries() {
  try {
    const exerciseModes = getSelectedSeriesModes();

    if (!exerciseModes.length) {
      alert("Sélectionne au moins un type d'exercice.");
      return;
    }

    const allowedWordCounts = getSelectedWordCounts();

    if (exerciseModes.includes("word_list") && !allowedWordCounts.length) {
      alert("Sélectionne au moins une taille pour les listes de mots.");
      return;
    }

    const payload = {
      user_name: els.seriesUserName.value.trim() || null,
      number_of_exercises: Number(els.seriesCountSelect.value),
      exercise_modes: exerciseModes,
      allowed_word_counts: allowedWordCounts
    };

    const series = await fetchJson(`${API_BASE_URL}/practice-series`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    state.currentSeriesId = series.id;
    els.seriesIdLabel.textContent = String(series.id);
    els.seriesStatusLabel.textContent = series.status;
    els.seriesIdInput.value = String(series.id);

    const sessions = await fetchJson(`${API_BASE_URL}/practice-series/${series.id}/sessions`);

    state.isSeriesPlaying = true;
    state.currentSeriesSessions = sessions;
    state.currentSeriesIndex = 0;

    await loadPracticeSeriesSessions(series.id);
    await loadPracticeSeriesSummary(series.id);

    if (sessions.length > 0) {
      setPracticeMode("single");
      loadSessionIntoPlayer(sessions[0]);
    } else {
      alert("La série a été créée mais aucune session n'a été générée.");
    }
  } catch (error) {
    console.error(error);
    alert(`Impossible de lancer la série : ${error.message}`);
  }
}

async function advanceToNextSeriesSession() {
  if (!state.isSeriesPlaying) {
    return;
  }

  const nextIndex = state.currentSeriesIndex + 1;

  if (nextIndex >= state.currentSeriesSessions.length) {
    els.typingInput.disabled = true;
    stopTimer();

    await loadPracticeSeriesSessions(state.currentSeriesId);
    await loadPracticeSeriesSummary(state.currentSeriesId);

    alert("Série terminée. Le résumé agrégé a été mis à jour.");
    resetSeriesPlayState();
    return;
  }

  state.currentSeriesIndex = nextIndex;
  const nextSession = state.currentSeriesSessions[nextIndex];
  loadSessionIntoPlayer(nextSession);
}

async function loadPracticeSeriesSessions(seriesId) {
  try {
    const sessions = await fetchJson(`${API_BASE_URL}/practice-series/${seriesId}/sessions`);

    els.seriesSessionsList.innerHTML = "";

    if (!sessions.length) {
      els.seriesSessionsList.innerHTML = '<p class="empty-state">Aucune session dans cette série.</p>';
      return;
    }

    sessions.forEach((session) => {
      const item = document.createElement("article");
      item.className = "history-item";

      const main = document.createElement("div");
      main.className = "history-main";
      main.innerHTML = `
        <strong>Session #${session.id}</strong>
        <span>${session.status}</span>
      `;

      const exercise = document.createElement("div");
      exercise.className = "history-cell";
      exercise.textContent = `Exercice · ${session.exercise_id}`;

      const textLength = document.createElement("div");
      textLength.className = "history-cell";
      textLength.textContent = `Longueur · ${Array.from(session.reference_text || "").length}`;

      const started = document.createElement("div");
      started.className = "history-cell";
      started.textContent = `Créée · ${new Date(session.started_at).toLocaleString("fr-FR")}`;

      item.append(main, exercise, textLength, started);
      els.seriesSessionsList.appendChild(item);
    });
  } catch (error) {
    console.error("Erreur chargement sessions série:", error);
  }
}

async function loadPracticeSeriesSummary(seriesId) {
  try {
    const summary = await fetchJson(`${API_BASE_URL}/practice-series/${seriesId}/summary`);

    els.seriesCompletedSessions.textContent = `${summary.completed_sessions}/${summary.total_sessions}`;
    els.seriesAverageWpm.textContent = formatNumber(summary.average_wpm);
    els.seriesAverageAccuracy.textContent = `${formatNumber(summary.average_accuracy)} %`;
    els.seriesTotalErrors.textContent = String(summary.total_errors);

    renderPairList(els.seriesTopCharacters, summary.top_characters || []);
    renderPairList(els.seriesTopWords, summary.top_words || []);
    renderPairList(els.seriesTopBigrams, summary.top_bigrams || []);

    els.seriesIdLabel.textContent = String(summary.series_id);
  } catch (error) {
    console.error("Erreur résumé série:", error);
    alert(`Impossible de charger le résumé : ${error.message}`);
  }
}

async function handleLoadSeriesSummary() {
  const seriesId = Number(els.seriesIdInput.value);

  if (!seriesId) {
    alert("Entre un ID de série.");
    return;
  }

  await loadPracticeSeriesSessions(seriesId);
  await loadPracticeSeriesSummary(seriesId);
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
    renderKeyValueList(els.modalWeakBigrams, payload.weak_bigrams || {});
    renderSimpleList(els.modalSuggestedFocus, payload.suggested_focus || []);

    openSessionModal();
  } catch (error) {
    console.error("Erreur détail session:", error);
    alert("Impossible de charger le détail de la session.");
  }
}

function bindEvents() {
  els.themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  els.tabText.addEventListener("click", () => setExerciseMode("text"));
  els.tabWordList.addEventListener("click", () => setExerciseMode("word_list"));

  els.modeSingleTab.addEventListener("click", () => setPracticeMode("single"));
  els.modeSeriesTab.addEventListener("click", () => setPracticeMode("series"));

  els.createTextExerciseBtn.addEventListener("click", createTextExercise);
  els.createWordListExerciseBtn.addEventListener("click", createWordListExercise);

  els.exerciseSelect.addEventListener("change", updateWordCountVisibility);
  els.refreshExercisesBtn.addEventListener("click", loadExercises);
  els.startSessionBtn.addEventListener("click", startSession);
  els.randomSessionBtn.addEventListener("click", startRandomSession);
  els.resetSessionBtn.addEventListener("click", resetTypingState);
  els.refreshResultsBtn.addEventListener("click", loadResultsHistory);

  els.startSeriesBtn.addEventListener("click", startPracticeSeries);
  els.loadSeriesSummaryBtn.addEventListener("click", handleLoadSeriesSummary);

  els.typingInput.addEventListener("keydown", processTypingKey);
  els.typingInput.addEventListener("paste", (event) => event.preventDefault());

  els.seriesModeText.addEventListener("change", updateSeriesWordCountVisibility);
  els.seriesModeWordList.addEventListener("change", updateSeriesWordCountVisibility);

  els.closeSessionModalBtn.addEventListener("click", closeSessionModal);
  els.sessionModalBackdrop.addEventListener("click", closeSessionModal);

  els.historyPrevBtn.addEventListener("click", goToPreviousHistoryPage);
  els.historyNextBtn.addEventListener("click", goToNextHistoryPage);
}

async function init() {
  applyTheme(state.theme);
  bindEvents();
  renderReferenceText();

  updateLiveMetrics();
  updateSeriesWordCountVisibility();

  resetSeriesSummaryView();
  resetSeriesPlayState();

  await loadExercises();
  await loadResultsHistory();
}

init();