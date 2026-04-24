export function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const themeLabel = document.getElementById("theme-label");
  let theme = localStorage.getItem("typing-theme") || "light";

  function applyTheme(nextTheme) {
    theme = nextTheme;
    document.body.setAttribute("data-theme", nextTheme);
    localStorage.setItem("typing-theme", nextTheme);
    if (themeLabel) {
      themeLabel.textContent = nextTheme === "dark" ? "Mode clair" : "Mode sombre";
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      applyTheme(theme === "dark" ? "light" : "dark");
    });
  }

  applyTheme(theme);
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderKeyValueList(container, entries) {
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
    const metric = document.createElement("strong");

    label.textContent = key;
    metric.textContent = String(value);

    li.append(label, metric);
    container.appendChild(li);
  });
}

export function renderPairList(container, entries, formatter = (value) => String(value)) {
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
    const metric = document.createElement("strong");

    label.textContent = key;
    metric.textContent = formatter(value);

    li.append(label, metric);
    container.appendChild(li);
  });
}

export function renderSimpleList(container, values) {
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
