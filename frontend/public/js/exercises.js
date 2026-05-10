import { API_BASE_URL, fetchJson } from "./api.js";
import { initTheme } from "./ui.js";

const els = {
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
  feedback: document.getElementById("exercise-feedback"),
};

function setExerciseMode(mode) {
  els.tabText.classList.toggle("active", mode === "text");
  els.tabWordList.classList.toggle("active", mode === "word_list");
  els.textForm.classList.toggle("hidden", mode !== "text");
  els.wordListForm.classList.toggle("hidden", mode !== "word_list");
}

function setFeedback(message, isError = false) {
  els.feedback.textContent = message;
  els.feedback.classList.toggle("danger-copy", isError);
}

async function createTextExercise() {
  const title = els.textExerciseTitle.value.trim();
  const content = els.textExerciseContent.value.trim();

  if (!title) {
    setFeedback("Ajoute un titre.", true);
    return;
  }

  if (!content) {
    setFeedback("Ajoute un texte.", true);
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
        difficulty: els.textExerciseDifficulty.value,
      }),
    });

    els.textExerciseTitle.value = "";
    els.textExerciseContent.value = "";
    setFeedback("Exercice texte créé.");
  } catch (error) {
    console.error(error);
    setFeedback("Impossible de créer l'exercice texte.", true);
  }
}

async function createWordListExercise() {
  const title = els.wordListTitle.value.trim();
  const content = els.wordListContent.value.trim();

  if (!title) {
    setFeedback("Ajoute un titre.", true);
    return;
  }

  if (!content) {
    setFeedback("Ajoute une liste de mots.", true);
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
        difficulty: els.wordListDifficulty.value,
      }),
    });

    els.wordListTitle.value = "";
    els.wordListContent.value = "";
    setFeedback("Liste de mots créée.");
  } catch (error) {
    console.error(error);
    setFeedback("Impossible de créer la liste de mots.", true);
  }
}

function bindEvents() {
  els.tabText.addEventListener("click", () => setExerciseMode("text"));
  els.tabWordList.addEventListener("click", () => setExerciseMode("word_list"));
  els.createTextExerciseBtn.addEventListener("click", createTextExercise);
  els.createWordListExerciseBtn.addEventListener("click", createWordListExercise);
}

function init() {
  initTheme();
  bindEvents();
  setExerciseMode("text");
  setFeedback("Crée un exercice texte ou une liste de mots.");
}

init();
