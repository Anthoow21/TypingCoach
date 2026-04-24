export const API_BASE_URL = "http://localhost:8000";

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail);
  }

  return response.json();
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2
  }).format(Number(value));
}
