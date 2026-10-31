/**
 * User syllable dictionary.
 *
 * Manual splits are the final authority in Parts, so every manual split is
 * remembered per word and re-applied wherever the same word appears later —
 * new lines, duplicated sections, restored words, freshly imported lyrics.
 *
 * Storage is browser-local (localStorage) for now. The backend is expected to
 * move off Vercel/Firebase later; when it does, this module is the single seam
 * to replace with a server-side, per-workspace, shared dictionary. Callers only
 * use lookupSyllables()/rememberSyllables()/forgetSyllables(), so swapping the
 * backing store must not touch UI code.
 */

const STORAGE_KEY = "choirscript.syllableDictionary.v1";
const APPLY_SCOPE_KEY = "choirscript.syllableApplyScope.v1";

type SyllableDictionary = Record<string, string[]>;

let cache: SyllableDictionary | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function sanitizeEntry(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const pieces = value
    .filter((piece): piece is string => typeof piece === "string")
    .map((piece) => piece.trim())
    .filter(Boolean);

  return pieces.length > 1 ? pieces : null;
}

function sanitizeDictionary(value: unknown): SyllableDictionary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const dictionary: SyllableDictionary = {};

  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const pieces = sanitizeEntry(entry);

    if (key.trim() && pieces) {
      dictionary[normalizeWordKey(key)] = pieces;
    }
  });

  return dictionary;
}

/**
 * Dictionary keys ignore surrounding case and whitespace so "Savior" and
 * "savior" share one entry. Punctuation stays part of the key via the word
 * itself ("(Savior)" is stored as its own word) because the splitter already
 * carries leading/trailing punctuation across the derived pieces.
 */
export function normalizeWordKey(word: string) {
  return word.trim().toLocaleLowerCase();
}

export function getSyllableDictionary(): SyllableDictionary {
  if (cache) {
    return cache;
  }

  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? sanitizeDictionary(JSON.parse(raw)) : {};
  } catch {
    cache = {};
  }

  return cache;
}

function persist(dictionary: SyllableDictionary) {
  cache = dictionary;

  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dictionary));
  } catch {
    // A full or blocked storage quota must never break an edit. The in-memory
    // cache still applies for this session.
  }
}

export function lookupSyllables(word: string): string[] | null {
  const pieces = getSyllableDictionary()[normalizeWordKey(word)];
  return pieces ? [...pieces] : null;
}

/** Record (or replace) the manual split for a word. 1-piece input forgets it. */
export function rememberSyllables(word: string, pieces: string[]) {
  const key = normalizeWordKey(word);
  const clean = sanitizeEntry(pieces);
  const dictionary = { ...getSyllableDictionary() };

  if (!key) {
    return;
  }

  if (!clean) {
    delete dictionary[key];
  } else {
    dictionary[key] = clean;
  }

  persist(dictionary);
}

export function forgetSyllables(word: string) {
  const key = normalizeWordKey(word);
  const dictionary = { ...getSyllableDictionary() };

  if (!key || !(key in dictionary)) {
    return;
  }

  delete dictionary[key];
  persist(dictionary);
}

/** Per-device preference for "apply to every occurrence in this song". */
export function getApplyEverywherePreference(): boolean {
  if (!isBrowser()) {
    return true;
  }

  try {
    return window.localStorage.getItem(APPLY_SCOPE_KEY) !== "off";
  } catch {
    return true;
  }
}

const preferenceListeners = new Set<() => void>();

/** useSyncExternalStore subscription; storage events keep other tabs in sync. */
export function subscribeApplyEverywherePreference(listener: () => void) {
  preferenceListeners.add(listener);

  if (isBrowser()) {
    window.addEventListener("storage", listener);
  }

  return () => {
    preferenceListeners.delete(listener);

    if (isBrowser()) {
      window.removeEventListener("storage", listener);
    }
  };
}

export function setApplyEverywherePreference(enabled: boolean) {
  if (isBrowser()) {
    try {
      window.localStorage.setItem(APPLY_SCOPE_KEY, enabled ? "on" : "off");
    } catch {
      // Preference persistence is best-effort.
    }
  }

  preferenceListeners.forEach((listener) => listener());
}
