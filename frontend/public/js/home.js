import { API_BASE_URL, fetchJson } from "./api.js";
import { initTheme } from "./ui.js";
import { TypingSessionPlayer } from "./typing-session.js";

const state = {
  exercises: [],
  selectedExercise: null,
};

const els = {
  userName: document.getElementById("user-name"),
  exerciseSelect: document.getElementById("exercise-select"),
  wordCountField: document.getElementById("word-count-field"),
  wordCountSelect: document.getElementById("word-count-select"),
  refreshExercisesBtn: document.getElementById("refresh-exercises-btn"),
  randomSessionBtn: document.getElementById("random-session-btn"),
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
  weakSequences: document.getElementById("weak-sequences"),
  suggestedFocus: document.getElementById("suggested-focus"),
  resultReplayText: document.getElementById("result-replay-text"),
};

const player = new TypingSessionPlayer(els);

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
  state.selectedExercise = state.exercises.find((item) => item.id === selectedId) || null;
  els.wordCountField.classList.toggle("hidden", state.selectedExercise?.exercise_type !== "word_list");
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

async function startSession() {
  const exercise = state.exercises.find((item) => item.id === Number(els.exerciseSelect.value));
  const userName = els.userName.value.trim();

  if (!exercise) {
    alert("Choisis un exercice.");
    return;
  }

  if (!userName) {
    alert("Renseigne un nom avant de lancer la session.");
    els.userName.focus();
    return;
  }

  try {
    const body = {
      exercise_id: exercise.id,
      user_name: userName,
    };

    if (exercise.exercise_type === "word_list") {
      body.word_count = Number(els.wordCountSelect.value);
    }

    const session = await fetchJson(`${API_BASE_URL}/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    player.loadSession(session);
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

  const exercise = state.exercises[Math.floor(Math.random() * state.exercises.length)];
  els.exerciseSelect.value = String(exercise.id);
  updateWordCountVisibility();

  if (exercise.exercise_type === "word_list") {
    const counts = [25, 40, 50, 75, 100];
    els.wordCountSelect.value = String(counts[Math.floor(Math.random() * counts.length)]);
  }

  await startSession();
}

function bindEvents() {
  els.exerciseSelect.addEventListener("change", updateWordCountVisibility);
  els.refreshExercisesBtn.addEventListener("click", loadExercises);
  els.randomSessionBtn.addEventListener("click", startRandomSession);
  els.startSessionBtn.addEventListener("click", startSession);
  els.resetSessionBtn.addEventListener("click", () => player.reset());
}

async function init() {
  initTheme();
  bindEvents();
  await loadExercises();
}

init();
