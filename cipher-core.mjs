export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const METHODS = Object.freeze(["caesar", "vigenere", "autokey", "general", "beaufort"]);

export function normalizeKey(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

function mod26(value) {
  return ((value % 26) + 26) % 26;
}

export function substitutionAlphabet(keyword) {
  const normalized = normalizeKey(keyword);
  if (!normalized) throw new TypeError("General substitution requires an A–Z keyword.");
  const unique = [...new Set(normalized)];
  const remaining = [...ALPHABET].filter((letter) => !unique.includes(letter));
  const filledRows = [...unique, ...remaining];
  const columnCount = unique.length;
  const columnRead = [];

  for (let column = 0; column < columnCount; column += 1) {
    for (let row = 0; row * columnCount + column < filledRows.length; row += 1) {
      columnRead.push(filledRows[row * columnCount + column]);
    }
  }
  return columnRead.join("");
}

export function encrypt(text, method, options = {}) {
  if (typeof text !== "string") throw new TypeError("Text must be a string.");
  if (!METHODS.includes(method)) throw new RangeError(`Unknown cipher method: ${method}`);

  const key = normalizeKey(options.key);
  const shift = mod26(Number(options.shift) || 0);
  if (method !== "caesar" && !key) throw new TypeError(`${method} requires an A–Z key.`);

  const substitution = method === "general" ? substitutionAlphabet(key) : "";
  const letters = [...text]
    .filter((character) => /^[A-Za-z]$/.test(character))
    .map((character) => character.toUpperCase());
  const rows = [];
  let output = "";
  let alphaPosition = 0;

  for (const character of text) {
    const upper = character.toUpperCase();
    const plainIndex = upper.length === 1 ? ALPHABET.indexOf(upper) : -1;
    if (plainIndex < 0) {
      output += character;
      rows.push({ position: "—", plain: character, key: "—", cipher: character, formula: "คงเดิม", encrypted: false });
      continue;
    }

    let cipherIndex = plainIndex;
    let keyCharacter = "";
    let formula = "";

    if (method === "caesar") {
      cipherIndex = mod26(plainIndex + shift);
      keyCharacter = `${ALPHABET[shift]} (+${shift})`;
      formula = `${upper} + ${ALPHABET[shift]} → ${ALPHABET[cipherIndex]}`;
    } else if (method === "vigenere") {
      keyCharacter = key[alphaPosition % key.length];
      cipherIndex = mod26(plainIndex + ALPHABET.indexOf(keyCharacter));
      formula = `${upper} + ${keyCharacter} → ${ALPHABET[cipherIndex]}`;
    } else if (method === "autokey") {
      keyCharacter = alphaPosition < key.length ? key[alphaPosition] : letters[alphaPosition - key.length];
      cipherIndex = mod26(plainIndex + ALPHABET.indexOf(keyCharacter));
      formula = `${upper} + ${keyCharacter} → ${ALPHABET[cipherIndex]}`;
    } else if (method === "general") {
      const replacement = substitution[plainIndex];
      keyCharacter = `→ ${replacement}`;
      formula = `${upper} → ${replacement}`;
    } else {
      keyCharacter = key[alphaPosition % key.length];
      cipherIndex = mod26(ALPHABET.indexOf(keyCharacter) - plainIndex);
      formula = `${keyCharacter} − ${upper} → ${ALPHABET[cipherIndex]}`;
    }

    const cipherUpper = method === "general" ? substitution[plainIndex] : ALPHABET[cipherIndex];
    const cipher = character === upper ? cipherUpper : cipherUpper.toLowerCase();
    output += cipher;
    rows.push({
      position: `${plainIndex + 1} · ${ALPHABET[plainIndex]}`,
      plain: character,
      key: keyCharacter,
      cipher,
      formula,
      encrypted: true,
    });
    alphaPosition += 1;
  }

  return {
    output,
    rows,
    method,
    key: method === "caesar" ? `${ALPHABET[shift]} (+${shift})` : key,
    substitution,
  };
}
