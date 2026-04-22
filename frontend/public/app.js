const backendStatusEl = document.getElementById("backend-status");
const analysisStatusEl = document.getElementById("analysis-status");
const refreshBtn = document.getElementById("refresh-btn");

// Constantes pour les statuts et classes
const STATUS = Object.freeze({
  OK: 'OK',
  ERROR: 'Erreur',
  PENDING: 'Inconnu',
  LOADING: 'Chargement...'
});

const CLASS = Object.freeze({
  OK: 'status ok',
  ERROR: 'status error',
  PENDING: 'status pending',
  LOADING: 'status pending'
});

// Fonction pour mettre à jour le statut d'un élément
function updateStatus(element, statusKey) {
  element.textContent = STATUS[statusKey];
  element.className = CLASS[statusKey];
}

// Fonction générique pour vérifier la santé
async function fetchHealth(url, element, checkStatus) {
  updateStatus(element, 'LOADING');
  try {
    const response = await fetch(url);
    const data = await response.json();
    const statusKey = checkStatus(data) ? 'OK' : 'PENDING';
    updateStatus(element, statusKey);
  } catch (error) {
    updateStatus(element, 'ERROR');
  }
}

async function refreshStatuses() {
  updateStatus(backendStatusEl, 'LOADING');
  updateStatus(analysisStatusEl, 'LOADING');

  await fetchHealth("http://localhost:8000/health", backendStatusEl, data => data.status === "ok");
  await fetchHealth("http://localhost:8000/analysis/health", analysisStatusEl, data => data.analysis && data.analysis.status === "ok");
}

refreshBtn.addEventListener("click", refreshStatuses);

refreshStatuses();