import { API_BASE_URL, fetchJson, formatNumber } from "./api.js";
import { escapeHtml, renderKeyValueList, renderSimpleList } from "./ui.js";

export class TypingSessionPlayer {
  constructor(elements, options = {}) {
    this.els = elements;
    this.options = options;
    this.state = this.getInitialState();

    this.processTypingKey = this.processTypingKey.bind(this);
    this.els.typingInput.addEventListener("keydown", this.processTypingKey);
    this.els.typingInput.addEventListener("paste", (event) => event.preventDefault());

    this.reset();
  }

  getInitialState() {
    return {
      currentSessionId: null,
      currentReferenceText: "",
      timerInterval: null,
      sessionStartedAt: null,
      lockedErrorIndex: null,
      lockedMistypedChar: null,
      typedHistory: [],
      errorEvents: [],
      keyEvents: [],
      timerStarted: false,
    };
  }

  secondsSince(startDate) {
    if (!startDate) {
      return 0;
    }
    return (Date.now() - startDate.getTime()) / 1000;
  }

  stopTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
  }

  startTimer() {
    this.stopTimer();
    this.state.sessionStartedAt = new Date();

    this.state.timerInterval = setInterval(() => {
      this.els.timerLabel.textContent = `${formatNumber(this.secondsSince(this.state.sessionStartedAt))} s`;
    }, 100);
  }

  currentProgressIndex() {
    return this.state.typedHistory.length;
  }

  currentErrorCount() {
    return this.state.errorEvents.length;
  }

  syncTypingInputValue() {
    const validated = this.state.typedHistory.join("");
    const wrongPart = this.state.lockedMistypedChar || "";
    this.els.typingInput.value = validated + wrongPart;
  }

  updateLiveMetrics() {
    const referenceLength = Array.from(this.state.currentReferenceText).length;
    const progress = referenceLength
      ? Math.floor((this.currentProgressIndex() / referenceLength) * 100)
      : 0;

    this.els.liveCharCount.textContent = String(this.currentProgressIndex());
    this.els.liveProgress.textContent = `${progress}%`;
    this.els.liveErrorCount.textContent = String(this.currentErrorCount());
  }

  renderReferenceText() {
    const referenceChars = Array.from(this.state.currentReferenceText);

    if (!referenceChars.length) {
      this.els.referenceTextRender.innerHTML = '<span class="empty-state">Lance une session pour commencer.</span>';
      return;
    }

    const progress = this.currentProgressIndex();
    const locked = this.state.lockedErrorIndex;

    const words = [];
    let currentWord = [];

    referenceChars.forEach((char, index) => {
      if (char === " ") {
        if (currentWord.length) {
          words.push({ type: "word", chars: currentWord });
          currentWord = [];
        }
        words.push({ type: "space", chars: [{ char: " ", index }] });
      } else {
        currentWord.push({ char, index });
      }
    });

    if (currentWord.length) {
      words.push({ type: "word", chars: currentWord });
    }

    const html = words.map((token) => {
      const charsHtml = token.chars.map(({ char, index }) => {
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
      }).join("");

      if (token.type === "space") {
        return `<span class="word space-word">${charsHtml}</span>`;
      }

      return `<span class="word">${charsHtml}</span>`;
    }).join("");

    this.els.referenceTextRender.innerHTML = html;
  }

  renderResultReplay(referenceText, errorEvents) {
    if (!referenceText) {
      this.els.resultReplayText.innerHTML = '<span class="empty-state">Le texte annoté apparaîtra ici après la session.</span>';
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
        tokens.push({ type: "space", chars: [{ char: " ", index }] });
      } else {
        currentWord.push({ char, index });
      }
    });

    if (currentWord.length) {
      tokens.push({ type: "word", chars: currentWord });
    }

    const html = tokens.map((token) => {
      const charsHtml = token.chars.map(({ char, index }) => {
        const errorEvent = errorMap.get(index);
        const cls = errorEvent ? "replay-char corrected" : "replay-char clean";
        const isSpace = char === " ";
        const safeChar = isSpace ? "&nbsp;" : escapeHtml(char);
        const extraClass = isSpace ? " space" : "";
        const tooltip = errorEvent
          ? ` title="Attendu : ${escapeHtml(errorEvent.expected_char)} | Tapé : ${escapeHtml(errorEvent.typed_char)}"`
          : "";

        return `<span class="${cls}${extraClass}"${tooltip}>${safeChar}</span>`;
      }).join("");

      if (token.type === "space") {
        return `<span class="replay-word replay-space-word">${charsHtml}</span>`;
      }

      return `<span class="replay-word">${charsHtml}</span>`;
    }).join("");

    this.els.resultReplayText.innerHTML = html;
  }

  resetResultsView() {
    this.els.resultWpm.textContent = "—";
    this.els.resultAccuracy.textContent = "—";
    this.els.resultErrors.textContent = "—";
    this.els.resultReplayText.innerHTML = '<span class="empty-state">Le texte annoté apparaîtra ici après la session.</span>';
    renderKeyValueList(this.els.mistakesByCharacter, {});
    renderKeyValueList(this.els.weakWords, {});
    renderKeyValueList(this.els.weakSequences, {});
    renderSimpleList(this.els.suggestedFocus, []);
  }

  reset() {
    this.state = this.getInitialState();
    this.stopTimer();
    this.els.sessionIdLabel.textContent = "—";
    this.els.timerLabel.textContent = "0.0 s";
    this.els.typingInput.value = "";
    this.els.typingInput.disabled = true;
    this.els.referenceTextRender.innerHTML = '<span class="empty-state">Lance une session pour commencer.</span>';
    this.updateLiveMetrics();
    this.resetResultsView();
  }

  loadSession(session) {
    this.stopTimer();
    this.state.currentSessionId = session.id;
    this.state.currentReferenceText = session.reference_text;
    this.state.lockedErrorIndex = null;
    this.state.lockedMistypedChar = null;
    this.state.typedHistory = [];
    this.state.errorEvents = [];
    this.state.keyEvents = [];
    this.state.timerStarted = false;
    this.state.sessionStartedAt = null;

    this.els.sessionIdLabel.textContent = String(session.id);
    this.els.timerLabel.textContent = "0.0 s";
    this.els.typingInput.disabled = false;
    this.syncTypingInputValue();
    this.renderReferenceText();
    this.updateLiveMetrics();
    this.resetResultsView();
    this.els.typingInput.focus();
  }

  getEventTimestampMs() {
    if (!this.state.sessionStartedAt) {
      return 0;
    }

    return Math.max(Date.now() - this.state.sessionStartedAt.getTime(), 0);
  }

  recordKeyEvent({
    key,
    expectedChar = null,
    position,
    eventType,
    isError = false,
    isCorrection = false,
  }) {
    this.state.keyEvents.push({
      key,
      expected_char: expectedChar,
      position,
      timestamp_ms: this.getEventTimestampMs(),
      event_type: eventType,
      is_error: isError,
      is_correction: isCorrection,
    });
  }

  async loadDetailedAnalysis(sessionId) {
    const analysis = await fetchJson(`${API_BASE_URL}/analyses/session/${sessionId}`);
    const payload = analysis.analysis_payload || {};

    renderKeyValueList(this.els.mistakesByCharacter, payload.mistakes_by_character || {});
    renderKeyValueList(this.els.weakWords, payload.weak_words || {});
    renderKeyValueList(this.els.weakSequences, payload.weak_sequences || payload.weak_bigrams || {});
    renderSimpleList(this.els.suggestedFocus, payload.suggested_focus || []);
    this.renderResultReplay(payload.reference_text || this.state.currentReferenceText, payload.error_events || this.state.errorEvents);
  }

  finishSessionAutomatically() {
    const typedText = this.state.typedHistory.join("");
    const durationSeconds = Math.max(this.secondsSince(this.state.sessionStartedAt), 0.1);
    const errorCount = this.currentErrorCount();
    return this.completeSession(typedText, durationSeconds, errorCount);
  }

  async completeSession(typedText, durationSeconds, errorCount) {
    if (!this.state.currentSessionId) {
      return;
    }

    const result = await fetchJson(`${API_BASE_URL}/sessions/${this.state.currentSessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typed_text: typedText,
        duration_seconds: durationSeconds,
        error_count: errorCount,
        error_events: this.state.errorEvents,
        key_events: this.state.keyEvents,
      }),
    });

    this.stopTimer();
    this.els.typingInput.disabled = true;
    this.els.resultWpm.textContent = formatNumber(result.wpm);
    this.els.resultAccuracy.textContent = `${formatNumber(result.accuracy)} %`;
    this.els.resultErrors.textContent = String(result.error_count);

    await this.loadDetailedAnalysis(this.state.currentSessionId);

    if (this.options.onCompleted) {
      await this.options.onCompleted(result, this.state.currentSessionId);
    }
  }

  processTypingKey(event) {
    if (!this.state.currentReferenceText || !this.state.currentSessionId) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const referenceChars = Array.from(this.state.currentReferenceText);
    const progress = this.currentProgressIndex();
    const expectedChar = referenceChars[progress];

    if (!expectedChar) {
      return;
    }
    if (event.key.length !== 1 && event.key !== "Backspace") {
      return;
    }

    if (!this.state.timerStarted && event.key !== "Backspace") {
      this.state.timerStarted = true;
      this.startTimer();
    }

    event.preventDefault();

    if (this.state.lockedErrorIndex !== null) {
      if (event.key === "Backspace") {
        this.recordKeyEvent({
          key: event.key,
          expectedChar,
          position: progress,
          eventType: "backspace",
        });
        this.state.lockedMistypedChar = null;
        this.syncTypingInputValue();
        this.renderReferenceText();
        return;
      }

      if (event.key === expectedChar) {
        this.recordKeyEvent({
          key: event.key,
          expectedChar,
          position: progress,
          eventType: "input",
          isCorrection: true,
        });
        this.state.typedHistory.push(expectedChar);
        this.state.lockedErrorIndex = null;
        this.state.lockedMistypedChar = null;
        this.syncTypingInputValue();
        this.renderReferenceText();
        this.updateLiveMetrics();

        if (this.currentProgressIndex() >= referenceChars.length) {
          this.finishSessionAutomatically();
        }
      }

      return;
    }

    if (event.key === "Backspace") {
      return;
    }

    if (event.key === expectedChar) {
      this.recordKeyEvent({
        key: event.key,
        expectedChar,
        position: progress,
        eventType: "input",
      });
      this.state.typedHistory.push(expectedChar);
    } else {
      this.state.errorEvents.push({
        index: progress,
        expected_char: expectedChar,
        typed_char: event.key,
      });
      this.recordKeyEvent({
        key: event.key,
        expectedChar,
        position: progress,
        eventType: "input",
        isError: true,
      });
      this.state.lockedErrorIndex = progress;
      this.state.lockedMistypedChar = event.key;
    }

    this.syncTypingInputValue();
    this.renderReferenceText();
    this.updateLiveMetrics();

    if (this.state.lockedErrorIndex === null && this.currentProgressIndex() >= referenceChars.length) {
      this.finishSessionAutomatically();
    }
  }
}
