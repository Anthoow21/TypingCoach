import { API_BASE_URL, fetchJson } from "./api.js";
import { initTheme } from "./ui.js";
import { TypingSessionPlayer } from "./typing-session.js";

const state = {
  recommendations: [],
};

const els = {
  userName: document.getElementById("user-name"),
  loadRecommendationsBtn: document.getElementById("load-recommendations-btn"),
  recommendationsStatus: document.getElementById("recommendations-status"),
  recommendationsSummary: document.getElementById("recommendations-summary"),
  recoErrorsLabel: document.getElementById("reco-errors-label"),
  recoLatencyLabel: document.getElementById("reco-latency-label"),
  recommendationsList: document.getElementById("recommendations-list"),

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

function resetRecommendationsView(message = "Renseigne ton nom puis charge tes recommandations personnalisées.") {
  state.recommendations = [];
  els.recommendationsStatus.textContent = message;
  els.recommendationsSummary.classList.add("hidden");
  els.recoErrorsLabel.textContent = "-";
  els.recoLatencyLabel.textContent = "-";
  els.recommendationsList.innerHTML = `<p class="empty-state">${message}</p>`;
}

function renderRecommendationsSummary(summary = {}) {
  const errorLabels = [
    ...(summary.top_error_characters || []),
    ...(summary.top_error_sequences || []),
  ].filter(Boolean).slice(0, 4);
  const latencyLabels = [
    ...(summary.top_slow_characters || []),
    ...(summary.top_slow_sequences || []),
  ].filter(Boolean).slice(0, 4);

  els.recommendationsSummary.classList.remove("hidden");
  els.recoErrorsLabel.textContent = errorLabels.length ? errorLabels.join(", ") : "-";
  els.recoLatencyLabel.textContent = latencyLabels.length ? latencyLabels.join(", ") : "-";
}

async function startRecommendedSession(recommendation) {
  const userName = els.userName.value.trim();

  if (!userName) {
    alert("Renseigne un nom avant de lancer l'entraînement ciblé.");
    els.userName.focus();
    return;
  }

  try {
    const session = await fetchJson(`${API_BASE_URL}/recommendations/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: userName,
        title: recommendation.title,
        exercise_type: recommendation.exercise_type,
        language: recommendation.language,
        content: recommendation.content,
        difficulty: recommendation.difficulty,
        word_count: recommendation.word_count,
      }),
    });

    player.loadSession(session);
  } catch (error) {
    console.error(error);
    alert("Impossible de lancer l'entraînement ciblé.");
  }
}

function renderRecommendationsList(recommendations = []) {
  els.recommendationsList.innerHTML = "";

  if (!recommendations.length) {
    els.recommendationsList.innerHTML = '<p class="empty-state">Aucune recommandation disponible.</p>';
    return;
  }

  recommendations.forEach((recommendation) => {
    const card = document.createElement("article");
    card.className = "recommendation-card";

    const head = document.createElement("div");
    head.className = "recommendation-head";

    const text = document.createElement("div");
    text.innerHTML = `
      <p class="section-label">Practice cible</p>
      <h4>${recommendation.title}</h4>
      <p class="muted">${recommendation.rationale}</p>
    `;

    const launchButton = document.createElement("button");
    launchButton.className = "primary-button";
    launchButton.type = "button";
    launchButton.textContent = "Lancer";
    launchButton.addEventListener("click", () => startRecommendedSession(recommendation));

    head.append(text, launchButton);

    const focus = document.createElement("p");
    focus.className = "muted";
    focus.textContent = recommendation.focus_labels?.length
      ? `Cibles : ${recommendation.focus_labels.join(", ")}`
      : "Cibles : profil global";

    card.append(head, focus);
    els.recommendationsList.appendChild(card);
  });
}

async function loadRecommendations() {
  const userName = els.userName.value.trim();

  if (!userName) {
    alert("Renseigne un nom.");
    els.userName.focus();
    return;
  }

  try {
    const data = await fetchJson(`${API_BASE_URL}/recommendations/${encodeURIComponent(userName)}`);
    state.recommendations = data.recommendations || [];
    els.recommendationsStatus.textContent = data.message || "Recommandations chargées.";
    renderRecommendationsSummary(data.weakness_summary || {});
    renderRecommendationsList(state.recommendations);
  } catch (error) {
    console.error(error);
    resetRecommendationsView("Impossible de charger les recommandations.");
  }
}

function bindEvents() {
  els.loadRecommendationsBtn.addEventListener("click", loadRecommendations);
  els.userName.addEventListener("input", () => {
    if (!els.userName.value.trim()) {
      resetRecommendationsView();
    }
  });
}

function init() {
  initTheme();
  bindEvents();
  resetRecommendationsView();
}

init();
