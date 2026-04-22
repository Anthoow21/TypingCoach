const backendStatusEl = document.getElementById("backend-status");
const analysisStatusEl = document.getElementById("analysis-status");
const refreshBtn = document.getElementById("refresh-btn");

async function fetchBackendHealth() {
  try {
    const response = await fetch("http://localhost:8000/health");
    const data = await response.json();

    if (data.status === "ok") {
      backendStatusEl.textContent = "OK";
      backendStatusEl.className = "status ok";
    } else {
      backendStatusEl.textContent = "Inconnu";
      backendStatusEl.className = "status pending";
    }
  } catch (error) {
    backendStatusEl.textContent = "Erreur";
    backendStatusEl.className = "status error";
  }
}

async function fetchAnalysisHealth() {
  try {
    const response = await fetch("http://localhost:8000/analysis/health");
    const data = await response.json();

    if (data.analysis && data.analysis.status === "ok") {
      analysisStatusEl.textContent = "OK";
      analysisStatusEl.className = "status ok";
    } else {
      analysisStatusEl.textContent = "Inconnu";
      analysisStatusEl.className = "status pending";
    }
  } catch (error) {
    analysisStatusEl.textContent = "Erreur";
    analysisStatusEl.className = "status error";
  }
}

async function refreshStatuses() {
  backendStatusEl.textContent = "Chargement...";
  backendStatusEl.className = "status pending";

  analysisStatusEl.textContent = "Chargement...";
  analysisStatusEl.className = "status pending";

  await fetchBackendHealth();
  await fetchAnalysisHealth();
}

refreshBtn.addEventListener("click", refreshStatuses);

refreshStatuses();