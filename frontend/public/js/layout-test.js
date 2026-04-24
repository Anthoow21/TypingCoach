import { formatNumber } from "./api.js";
import { DEFAULT_KEYBOARD_LAYOUT, KEYBOARD_LAYOUTS, buildOutputLookup, buildOutputMap, getKeyboardLayout, getKeyboardLayoutIds, toKeyboardLayoutLabel } from "./keyboard-layouts.js";
import { escapeHtml, initTheme } from "./ui.js";

const WORD_BANK = [
  "alpha", "ami", "angle", "arbre", "atelier", "avenir", "balade", "banque", "brique", "brume",
  "calme", "canal", "carnet", "centre", "chaise", "clavier", "colline", "couleur", "danse", "dessin",
  "detail", "doigt", "doute", "ecole", "effort", "elan", "espace", "esprit", "etape", "etoile",
  "facile", "famille", "fenetre", "fleur", "fluidite", "force", "geste", "gomme", "gout", "grille",
  "hiver", "horizon", "image", "instant", "journal", "lampe", "lecture", "lettre", "ligne", "lumiere",
  "maison", "memoire", "minute", "mobile", "montagne", "mouvement", "nuage", "objet", "ombre", "orange",
  "parfum", "parole", "pause", "piano", "plume", "poche", "progres", "rapide", "regard", "repere",
  "respire", "riviere", "route", "rythme", "sable", "saison", "signal", "silence", "simple", "sourire",
  "studio", "table", "tempo", "terre", "texte", "travail", "vague", "valeur", "vitesse", "voyage"
];

const STORAGE_KEY = "typing-layout-test-layout";
const state = {
  layoutId: localStorage.getItem(STORAGE_KEY) || DEFAULT_KEYBOARD_LAYOUT,
  referenceText: "",
  typedHistory: [],
  lockedErrorIndex: null,
  lockedMistypedChar: null,
  errorCount: 0,
  timerStarted: false,
  startedAt: null,
  timerInterval: null,
  isComplete: false,
  activeCode: null,
  activeTone: null,
  activeTimeout: null,
  isArmed: false,
};

const els = {
  layoutSelect: document.getElementById("sim-layout-select"),
  wordCountSelect: document.getElementById("sim-word-count-select"),
  generateBtn: document.getElementById("sim-generate-btn"),
  resetBtn: document.getElementById("sim-reset-btn"),
  focusBtn: document.getElementById("sim-focus-btn"),
  stage: document.querySelector(".simulator-stage"),
  layoutChip: document.getElementById("layout-chip"),
  timerLabel: document.getElementById("sim-timer-label"),
  referenceText: document.getElementById("sim-reference-text"),
  keyboard: document.getElementById("sim-keyboard"),
};

function sampleWords(count) {
  const words = [];
  for (let index = 0; index < count; index += 1) {
    words.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }
  return words.join(" ");
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function secondsSinceStart() {
  if (!state.startedAt) {
    return 0;
  }
  return (Date.now() - state.startedAt.getTime()) / 1000;
}

function startTimer() {
  stopTimer();
  state.startedAt = new Date();
  state.timerInterval = setInterval(() => {
    els.timerLabel.textContent = `${formatNumber(secondsSinceStart())} s`;
  }, 100);
}

function currentProgressIndex() {
  return state.typedHistory.length;
}

function mapLegacyKeyCode(keyCode) {
  if (keyCode >= 65 && keyCode <= 90) {
    return `Key${String.fromCharCode(keyCode)}`;
  }
  if (keyCode >= 48 && keyCode <= 57) {
    return `Digit${keyCode - 48}`;
  }
  if (keyCode === 8) {
    return "Backspace";
  }
  if (keyCode === 32) {
    return "Space";
  }
  if (keyCode === 186) {
    return "Semicolon";
  }
  if (keyCode === 188) {
    return "Comma";
  }
  if (keyCode === 190) {
    return "Period";
  }
  if (keyCode === 191) {
    return "Slash";
  }
  return null;
}

function getEventCode(event) {
  return event.code || mapLegacyKeyCode(event.keyCode || event.which || 0);
}

function armSimulator() {
  state.isArmed = true;
  els.stage.classList.add("is-armed");
}

function disarmSimulator() {
  state.isArmed = false;
  els.stage.classList.remove("is-armed");
}

function renderReferenceText() {
  const chars = Array.from(state.referenceText);
  if (!chars.length) {
    els.referenceText.innerHTML = '<span class="empty-state">Genere un texte pour commencer.</span>';
    return;
  }

  const progress = currentProgressIndex();
  const locked = state.lockedErrorIndex;
  const html = chars.map((char, index) => {
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
    const extraClass = char === " " ? " space" : "";
    return `<span class="${cls}${extraClass}">${safeChar}</span>`;
  }).join("");

  els.referenceText.innerHTML = html;
}

function clearActiveKey() {
  if (state.activeTimeout) {
    clearTimeout(state.activeTimeout);
    state.activeTimeout = null;
  }
  state.activeCode = null;
  state.activeTone = null;
}

function flashKey(code, tone = "pressed") {
  clearActiveKey();
  state.activeCode = code;
  state.activeTone = tone;
  renderKeyboard();
  state.activeTimeout = setTimeout(() => {
    state.activeCode = null;
    state.activeTone = null;
    renderKeyboard();
  }, 170);
}

function renderKeyboard() {
  const layout = getKeyboardLayout(state.layoutId);
  const outputLookup = buildOutputLookup(state.layoutId);
  const expectedChar = Array.from(state.referenceText)[currentProgressIndex()] || null;
  const targetCode = expectedChar ? outputLookup[expectedChar] || null : null;

  els.keyboard.innerHTML = "";

  layout.rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "simulator-keyboard-row";

    row.forEach((entry) => {
      const keyEl = document.createElement("div");
      keyEl.className = "simulator-key";

      if (entry.code === "Space") {
        keyEl.classList.add("simulator-key-space");
      }
      if (entry.code === targetCode) {
        keyEl.classList.add("is-target");
      }
      if (entry.code === state.activeCode) {
        keyEl.classList.add("is-pressed");
        if (state.activeTone === "error") {
          keyEl.classList.add("is-error");
        }
      }

      const title = document.createElement("strong");
      title.textContent = entry.label;
      const subtitle = document.createElement("span");
      subtitle.textContent = entry.code === "Space" ? "barre espace" : entry.code.replace("Key", "").replace("Digit", "");

      keyEl.append(title, subtitle);
      rowEl.appendChild(keyEl);
    });

    els.keyboard.appendChild(rowEl);
  });
}

function resetSessionState() {
  state.typedHistory = [];
  state.lockedErrorIndex = null;
  state.lockedMistypedChar = null;
  state.errorCount = 0;
  state.timerStarted = false;
  state.startedAt = null;
  state.isComplete = false;
  stopTimer();
  els.timerLabel.textContent = "0.0 s";
  disarmSimulator();
  renderReferenceText();
  renderKeyboard();
}

function generateReference() {
  state.referenceText = sampleWords(Number(els.wordCountSelect.value));
  resetSessionState();
}

function completeSession() {
  state.isComplete = true;
  stopTimer();
  disarmSimulator();
}

function getMappedCharacter(code) {
  const outputMap = buildOutputMap(state.layoutId);
  return outputMap[code] ?? null;
}

function applyLayout(layoutId) {
  if (!KEYBOARD_LAYOUTS[layoutId]) {
    return;
  }

  state.layoutId = layoutId;
  localStorage.setItem(STORAGE_KEY, layoutId);
  els.layoutChip.textContent = toKeyboardLayoutLabel(layoutId);
  renderKeyboard();
}

function handleTyping(event) {
  if (!state.isArmed || !state.referenceText || state.isComplete) {
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const expectedChar = Array.from(state.referenceText)[currentProgressIndex()];
  if (!expectedChar) {
    return;
  }

  const physicalCode = getEventCode(event);
  const isBackspace = physicalCode === "Backspace";
  const mappedChar = physicalCode ? getMappedCharacter(physicalCode) : null;
  if (!isBackspace && mappedChar === null) {
    return;
  }

  event.preventDefault();

  if (!state.timerStarted && !isBackspace) {
    state.timerStarted = true;
    startTimer();
  }

  if (state.lockedErrorIndex !== null) {
    if (isBackspace) {
      state.lockedMistypedChar = null;
      renderReferenceText();
      if (physicalCode) {
        flashKey(physicalCode);
      }
      return;
    }

    if (mappedChar === expectedChar) {
      state.typedHistory.push(expectedChar);
      state.lockedErrorIndex = null;
      state.lockedMistypedChar = null;
      renderReferenceText();
      if (physicalCode) {
        flashKey(physicalCode);
      }
      if (currentProgressIndex() >= Array.from(state.referenceText).length) {
        completeSession();
      }
    } else {
      if (physicalCode) {
        flashKey(physicalCode, "error");
      }
    }
    return;
  }

  if (isBackspace) {
    return;
  }

  if (mappedChar === expectedChar) {
    state.typedHistory.push(expectedChar);
    if (physicalCode) {
      flashKey(physicalCode);
    }
  } else {
    state.errorCount += 1;
    state.lockedErrorIndex = currentProgressIndex();
    state.lockedMistypedChar = mappedChar;
    if (physicalCode) {
      flashKey(physicalCode, "error");
    }
  }

  renderReferenceText();

  if (state.lockedErrorIndex === null && currentProgressIndex() >= Array.from(state.referenceText).length) {
    completeSession();
  }
}

function populateLayoutSelect() {
  els.layoutSelect.innerHTML = "";
  getKeyboardLayoutIds().forEach((layoutId) => {
    const option = document.createElement("option");
    option.value = layoutId;
    option.textContent = toKeyboardLayoutLabel(layoutId);
    els.layoutSelect.appendChild(option);
  });

  if (!KEYBOARD_LAYOUTS[state.layoutId]) {
    state.layoutId = DEFAULT_KEYBOARD_LAYOUT;
  }
  els.layoutSelect.value = state.layoutId;
}

function bindEvents() {
  els.layoutSelect.addEventListener("change", (event) => {
    applyLayout(event.target.value);
  });
  els.wordCountSelect.addEventListener("change", generateReference);
  els.generateBtn.addEventListener("click", generateReference);
  els.resetBtn.addEventListener("click", resetSessionState);
  els.focusBtn.addEventListener("click", armSimulator);
  els.stage.addEventListener("click", armSimulator);
  window.addEventListener("keydown", handleTyping);
}

function init() {
  initTheme();
  populateLayoutSelect();
  bindEvents();
  applyLayout(state.layoutId);
  generateReference();
}

init();
