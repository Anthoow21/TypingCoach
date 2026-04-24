import { API_BASE_URL, fetchJson, formatNumber } from "./api.js";
import { initTheme } from "./ui.js";
import { renderPairList } from "./ui.js";
import { TypingSessionPlayer } from "./typing-session.js";

const state = {
  currentSeriesId: null,
  currentSeriesSessions: [],
  currentSeriesIndex: 0,
  isSeriesPlaying: false,
};

const els = {
  seriesUserName: document.getElementById("series-user-name"),
  seriesCountSelect: document.getElementById("series-count-select"),
  startSeriesBtn: document.getElementById("start-series-btn"),
  loadSeriesSummaryBtn: document.getElementById("load-series-summary-btn"),
  seriesIdInput: document.getElementById("series-id-input"),
  seriesIdLabel: document.getElementById("series-id-label"),
  seriesStatusLabel: document.getElementById("series-status-label"),
  seriesSessionsList: document.getElementById("series-sessions-list"),
  seriesModeText: document.getElementById("series-mode-text"),
  seriesModeWordList: document.getElementById("series-mode-word-list"),
  seriesWordCountsField: document.getElementById("series-word-counts-field"),
  seriesProgressBox: document.getElementById("series-progress-box"),
  seriesPlayIdLabel: document.getElementById("series-play-id-label"),
  seriesPlayProgressLabel: document.getElementById("series-play-progress-label"),
  seriesCurrentSessionLabel: document.getElementById("series-current-session-label"),
  seriesCurrentExerciseLabel: document.getElementById("series-current-exercise-label"),
  seriesCurrentStatusLabel: document.getElementById("series-current-status-label"),
  seriesCompletedSessions: document.getElementById("series-completed-sessions"),
  seriesAverageWpm: document.getElementById("series-average-wpm"),
  seriesAverageAccuracy: document.getElementById("series-average-accuracy"),
  seriesTopCharacters: document.getElementById("series-top-characters"),
  seriesTopWords: document.getElementById("series-top-words"),
  seriesTopSequences: document.getElementById("series-top-sequences"),
  seriesTotalErrors: document.getElementById("series-total-errors"),

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
  weakSequences: document.getElementById("weak-sequences"),
  suggestedFocus: document.getElementById("suggested-focus"),
  resultReplayText: document.getElementById("result-replay-text"),
};

const player = new TypingSessionPlayer(els, {
  onCompleted: async () => {
    await loadPracticeSeriesSessions(state.currentSeriesId);
    await loadPracticeSeriesSummary(state.currentSeriesId);
    await advanceToNextSeriesSession();
  },
});

function resetSeriesSummaryView() {
  els.seriesCompletedSessions.textContent = "—";
  els.seriesAverageWpm.textContent = "—";
  els.seriesAverageAccuracy.textContent = "—";
  els.seriesTotalErrors.textContent = "—";
  renderPairList(els.seriesTopCharacters, []);
  renderPairList(els.seriesTopWords, []);
  renderPairList(els.seriesTopSequences, []);
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
  els.seriesWordCountsField.classList.toggle("hidden", !els.seriesModeWordList.checked);
}

async function loadPracticeSeriesSessions(seriesId) {
  const sessions = await fetchJson(`${API_BASE_URL}/practice-series/${seriesId}/sessions`);
  els.seriesSessionsList.innerHTML = "";

  if (!sessions.length) {
    els.seriesSessionsList.innerHTML = '<p class="empty-state">Aucune session dans cette série.</p>';
    return;
  }

  sessions.forEach((session) => {
    const item = document.createElement("article");
    item.className = "history-card";
    item.innerHTML = `
      <div class="history-card-top">
        <div class="history-main">
          <strong>Session #${session.id}</strong>
          <span>${session.status}</span>
        </div>
        <span class="history-pill">Exercice #${session.exercise_id}</span>
      </div>
      <div class="history-meta-row">
        <span>Longueur · ${Array.from(session.reference_text || "").length}</span>
        <span>Créée · ${new Date(session.started_at).toLocaleString("fr-FR")}</span>
      </div>
    `;
    els.seriesSessionsList.appendChild(item);
  });
}

async function loadPracticeSeriesSummary(seriesId) {
  const summary = await fetchJson(`${API_BASE_URL}/practice-series/${seriesId}/summary`);

  els.seriesCompletedSessions.textContent = `${summary.completed_sessions}/${summary.total_sessions}`;
  els.seriesAverageWpm.textContent = formatNumber(summary.average_wpm);
  els.seriesAverageAccuracy.textContent = `${formatNumber(summary.average_accuracy)} %`;
  els.seriesTotalErrors.textContent = String(summary.total_errors);
  renderPairList(els.seriesTopCharacters, summary.top_characters || []);
  renderPairList(els.seriesTopWords, summary.top_words || []);
  renderPairList(els.seriesTopSequences, summary.top_sequences || summary.top_bigrams || []);

  els.seriesIdLabel.textContent = String(summary.series_id);
}

async function startPracticeSeries() {
  try {
    const userName = els.seriesUserName.value.trim();
    const exerciseModes = getSelectedSeriesModes();

    if (!userName) {
      alert("Renseigne un nom avant de lancer la série.");
      els.seriesUserName.focus();
      return;
    }

    if (!exerciseModes.length) {
      alert("Sélectionne au moins un type d'exercice.");
      return;
    }

    const allowedWordCounts = getSelectedWordCounts();
    if (exerciseModes.includes("word_list") && !allowedWordCounts.length) {
      alert("Sélectionne au moins une taille pour les listes de mots.");
      return;
    }

    const series = await fetchJson(`${API_BASE_URL}/practice-series`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: userName,
        number_of_exercises: Number(els.seriesCountSelect.value),
        exercise_modes: exerciseModes,
        allowed_word_counts: allowedWordCounts,
      }),
    });

    state.currentSeriesId = series.id;
    els.seriesIdLabel.textContent = String(series.id);
    els.seriesStatusLabel.textContent = series.status;
    els.seriesIdInput.value = String(series.id);

    state.currentSeriesSessions = await fetchJson(`${API_BASE_URL}/practice-series/${series.id}/sessions`);
    state.currentSeriesIndex = 0;
    state.isSeriesPlaying = true;

    await loadPracticeSeriesSessions(series.id);
    await loadPracticeSeriesSummary(series.id);

    if (state.currentSeriesSessions.length) {
      player.loadSession(state.currentSeriesSessions[0]);
      updateSeriesProgressUI();
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
    alert("Série terminée. Le résumé a été mis à jour.");
    resetSeriesPlayState();
    return;
  }

  state.currentSeriesIndex = nextIndex;
  player.loadSession(state.currentSeriesSessions[nextIndex]);
  updateSeriesProgressUI();
}

async function handleLoadSeriesSummary() {
  const seriesId = Number(els.seriesIdInput.value);

  if (!seriesId) {
    alert("Entre un ID de série.");
    return;
  }

  state.currentSeriesId = seriesId;
  await loadPracticeSeriesSessions(seriesId);
  await loadPracticeSeriesSummary(seriesId);
}

function bindEvents() {
  els.startSeriesBtn.addEventListener("click", startPracticeSeries);
  els.loadSeriesSummaryBtn.addEventListener("click", handleLoadSeriesSummary);
  els.seriesModeText.addEventListener("change", updateSeriesWordCountVisibility);
  els.seriesModeWordList.addEventListener("change", updateSeriesWordCountVisibility);
}

function init() {
  initTheme();
  bindEvents();
  updateSeriesWordCountVisibility();
  resetSeriesSummaryView();
  resetSeriesPlayState();
}

init();
