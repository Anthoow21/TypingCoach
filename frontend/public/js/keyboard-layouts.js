export const DEFAULT_KEYBOARD_LAYOUT = "azerty";

function defineLayout(id, label, rows) {
  return { id, label, rows };
}

function key(code, metricKey, label, output) {
  return {
    code,
    metricKey,
    label,
    output,
  };
}

export const KEYBOARD_LAYOUTS = {
  azerty: defineLayout("azerty", "AZERTY", [
    [key("Digit1", "1", "1", "1"), key("Digit2", "2", "2", "2"), key("Digit3", "3", "3", "3"), key("Digit4", "4", "4", "4"), key("Digit5", "5", "5", "5"), key("Digit6", "6", "6", "6"), key("Digit7", "7", "7", "7"), key("Digit8", "8", "8", "8"), key("Digit9", "9", "9", "9"), key("Digit0", "0", "0", "0")],
    [key("KeyQ", "A", "A", "a"), key("KeyW", "Z", "Z", "z"), key("KeyE", "E", "E", "e"), key("KeyR", "R", "R", "r"), key("KeyT", "T", "T", "t"), key("KeyY", "Y", "Y", "y"), key("KeyU", "U", "U", "u"), key("KeyI", "I", "I", "i"), key("KeyO", "O", "O", "o"), key("KeyP", "P", "P", "p")],
    [key("KeyA", "Q", "Q", "q"), key("KeyS", "S", "S", "s"), key("KeyD", "D", "D", "d"), key("KeyF", "F", "F", "f"), key("KeyG", "G", "G", "g"), key("KeyH", "H", "H", "h"), key("KeyJ", "J", "J", "j"), key("KeyK", "K", "K", "k"), key("KeyL", "L", "L", "l"), key("Semicolon", "M", "M", "m")],
    [key("KeyZ", "W", "W", "w"), key("KeyX", "X", "X", "x"), key("KeyC", "C", "C", "c"), key("KeyV", "V", "V", "v"), key("KeyB", "B", "B", "b"), key("KeyN", "N", "N", "n")],
    [key("Space", "Space", "Espace", " ")],
  ]),
  qwerty: defineLayout("qwerty", "QWERTY", [
    [key("Digit1", "1", "1", "1"), key("Digit2", "2", "2", "2"), key("Digit3", "3", "3", "3"), key("Digit4", "4", "4", "4"), key("Digit5", "5", "5", "5"), key("Digit6", "6", "6", "6"), key("Digit7", "7", "7", "7"), key("Digit8", "8", "8", "8"), key("Digit9", "9", "9", "9"), key("Digit0", "0", "0", "0")],
    [key("KeyQ", "Q", "Q", "q"), key("KeyW", "W", "W", "w"), key("KeyE", "E", "E", "e"), key("KeyR", "R", "R", "r"), key("KeyT", "T", "T", "t"), key("KeyY", "Y", "Y", "y"), key("KeyU", "U", "U", "u"), key("KeyI", "I", "I", "i"), key("KeyO", "O", "O", "o"), key("KeyP", "P", "P", "p")],
    [key("KeyA", "A", "A", "a"), key("KeyS", "S", "S", "s"), key("KeyD", "D", "D", "d"), key("KeyF", "F", "F", "f"), key("KeyG", "G", "G", "g"), key("KeyH", "H", "H", "h"), key("KeyJ", "J", "J", "j"), key("KeyK", "K", "K", "k"), key("KeyL", "L", "L", "l")],
    [key("KeyZ", "Z", "Z", "z"), key("KeyX", "X", "X", "x"), key("KeyC", "C", "C", "c"), key("KeyV", "V", "V", "v"), key("KeyB", "B", "B", "b"), key("KeyN", "N", "N", "n"), key("KeyM", "M", "M", "m")],
    [key("Space", "Space", "Espace", " ")],
  ]),
  qwertz: defineLayout("qwertz", "QWERTZ", [
    [key("Digit1", "1", "1", "1"), key("Digit2", "2", "2", "2"), key("Digit3", "3", "3", "3"), key("Digit4", "4", "4", "4"), key("Digit5", "5", "5", "5"), key("Digit6", "6", "6", "6"), key("Digit7", "7", "7", "7"), key("Digit8", "8", "8", "8"), key("Digit9", "9", "9", "9"), key("Digit0", "0", "0", "0")],
    [key("KeyQ", "Q", "Q", "q"), key("KeyW", "W", "W", "w"), key("KeyE", "E", "E", "e"), key("KeyR", "R", "R", "r"), key("KeyT", "T", "T", "t"), key("KeyY", "Z", "Z", "z"), key("KeyU", "U", "U", "u"), key("KeyI", "I", "I", "i"), key("KeyO", "O", "O", "o"), key("KeyP", "P", "P", "p")],
    [key("KeyA", "A", "A", "a"), key("KeyS", "S", "S", "s"), key("KeyD", "D", "D", "d"), key("KeyF", "F", "F", "f"), key("KeyG", "G", "G", "g"), key("KeyH", "H", "H", "h"), key("KeyJ", "J", "J", "j"), key("KeyK", "K", "K", "k"), key("KeyL", "L", "L", "l")],
    [key("KeyZ", "Y", "Y", "y"), key("KeyX", "X", "X", "x"), key("KeyC", "C", "C", "c"), key("KeyV", "V", "V", "v"), key("KeyB", "B", "B", "b"), key("KeyN", "N", "N", "n"), key("KeyM", "M", "M", "m")],
    [key("Space", "Space", "Espace", " ")],
  ]),
  bepo: defineLayout("bepo", "BEPO", [
    [key("Digit1", "1", "1", "1"), key("Digit2", "2", "2", "2"), key("Digit3", "3", "3", "3"), key("Digit4", "4", "4", "4"), key("Digit5", "5", "5", "5"), key("Digit6", "6", "6", "6"), key("Digit7", "7", "7", "7"), key("Digit8", "8", "8", "8"), key("Digit9", "9", "9", "9"), key("Digit0", "0", "0", "0")],
    [key("KeyQ", "B", "B", "b"), key("KeyW", "E", "E", "e"), key("KeyE", "P", "P", "p"), key("KeyR", "O", "O", "o"), key("KeyT", "\u00C8", "\u00C8", "\u00E8"), key("KeyY", "V", "V", "v"), key("KeyU", "D", "D", "d"), key("KeyI", "L", "L", "l"), key("KeyO", "J", "J", "j"), key("KeyP", "Z", "Z", "z")],
    [key("KeyA", "A", "A", "a"), key("KeyS", "U", "U", "u"), key("KeyD", "I", "I", "i"), key("KeyF", "\u00C9", "\u00C9", "\u00E9"), key("KeyG", "C", "C", "c"), key("KeyH", "T", "T", "t"), key("KeyJ", "S", "S", "s"), key("KeyK", "R", "R", "r"), key("KeyL", "N", "N", "n"), key("Semicolon", "M", "M", "m")],
    [key("KeyZ", "\u00C0", "\u00C0", "\u00E0"), key("KeyX", "Y", "Y", "y"), key("KeyC", "X", "X", "x"), key("KeyV", "K", "K", "k"), key("KeyB", "Q", "Q", "q"), key("KeyN", "G", "G", "g"), key("KeyM", "H", "H", "h"), key("Comma", "F", "F", "f")],
    [key("Space", "Space", "Espace", " ")],
  ]),
  colemak: defineLayout("colemak", "COLEMAK", [
    [key("Digit1", "1", "1", "1"), key("Digit2", "2", "2", "2"), key("Digit3", "3", "3", "3"), key("Digit4", "4", "4", "4"), key("Digit5", "5", "5", "5"), key("Digit6", "6", "6", "6"), key("Digit7", "7", "7", "7"), key("Digit8", "8", "8", "8"), key("Digit9", "9", "9", "9"), key("Digit0", "0", "0", "0")],
    [key("KeyQ", "Q", "Q", "q"), key("KeyW", "W", "W", "w"), key("KeyE", "F", "F", "f"), key("KeyR", "P", "P", "p"), key("KeyT", "G", "G", "g"), key("KeyY", "J", "J", "j"), key("KeyU", "L", "L", "l"), key("KeyI", "U", "U", "u"), key("KeyO", "Y", "Y", "y"), key("KeyP", ";", ";", ";")],
    [key("KeyA", "A", "A", "a"), key("KeyS", "R", "R", "r"), key("KeyD", "S", "S", "s"), key("KeyF", "T", "T", "t"), key("KeyG", "D", "D", "d"), key("KeyH", "H", "H", "h"), key("KeyJ", "N", "N", "n"), key("KeyK", "E", "E", "e"), key("KeyL", "I", "I", "i"), key("Semicolon", "O", "O", "o")],
    [key("KeyZ", "Z", "Z", "z"), key("KeyX", "X", "X", "x"), key("KeyC", "C", "C", "c"), key("KeyV", "V", "V", "v"), key("KeyB", "B", "B", "b"), key("KeyN", "K", "K", "k"), key("KeyM", "M", "M", "m")],
    [key("Space", "Space", "Espace", " ")],
  ]),
  dvorak: defineLayout("dvorak", "DVORAK", [
    [key("Digit1", "1", "1", "1"), key("Digit2", "2", "2", "2"), key("Digit3", "3", "3", "3"), key("Digit4", "4", "4", "4"), key("Digit5", "5", "5", "5"), key("Digit6", "6", "6", "6"), key("Digit7", "7", "7", "7"), key("Digit8", "8", "8", "8"), key("Digit9", "9", "9", "9"), key("Digit0", "0", "0", "0")],
    [key("KeyQ", "'", "'", "'"), key("KeyW", ",", ",", ","), key("KeyE", ".", ".", "."), key("KeyR", "P", "P", "p"), key("KeyT", "Y", "Y", "y"), key("KeyY", "F", "F", "f"), key("KeyU", "G", "G", "g"), key("KeyI", "C", "C", "c"), key("KeyO", "R", "R", "r"), key("KeyP", "L", "L", "l")],
    [key("KeyA", "A", "A", "a"), key("KeyS", "O", "O", "o"), key("KeyD", "E", "E", "e"), key("KeyF", "U", "U", "u"), key("KeyG", "I", "I", "i"), key("KeyH", "D", "D", "d"), key("KeyJ", "H", "H", "h"), key("KeyK", "T", "T", "t"), key("KeyL", "N", "N", "n"), key("Semicolon", "S", "S", "s")],
    [key("KeyZ", ";", ";", ";"), key("KeyX", "Q", "Q", "q"), key("KeyC", "J", "J", "j"), key("KeyV", "K", "K", "k"), key("KeyB", "X", "X", "x"), key("KeyN", "B", "B", "b"), key("KeyM", "M", "M", "m"), key("Comma", "W", "W", "w"), key("Period", "V", "V", "v"), key("Slash", "Z", "Z", "z")],
    [key("Space", "Space", "Espace", " ")],
  ]),
};

export function getKeyboardLayoutIds() {
  return Object.keys(KEYBOARD_LAYOUTS);
}

export function getKeyboardLayout(layoutId) {
  return KEYBOARD_LAYOUTS[layoutId] || KEYBOARD_LAYOUTS[DEFAULT_KEYBOARD_LAYOUT];
}

export function toKeyboardLayoutLabel(layoutId) {
  return getKeyboardLayout(layoutId).label;
}

export function buildOutputMap(layoutId) {
  const layout = getKeyboardLayout(layoutId);
  return Object.fromEntries(
    layout.rows.flat().map((entry) => [entry.code, entry.output])
  );
}

export function buildOutputLookup(layoutId) {
  const layout = getKeyboardLayout(layoutId);
  return Object.fromEntries(
    layout.rows.flat().map((entry) => [entry.output, entry.code])
  );
}
