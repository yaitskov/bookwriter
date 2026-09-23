const STORAGE_KEY = "unknown-word-dictionary";

export interface UnknownWordDictionary {
  has(word: string): boolean;
  add(word: string): void;
  remove(word: string): void;
  words(): string[];
  flush(): void;
}

function load(storage: Storage): Set<string> {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((word): word is string => typeof word === "string"));
  } catch {
    return new Set();
  }
}

class Dictionary implements UnknownWordDictionary {
  private readonly wordsSet: Set<string>;

  constructor(private readonly storage: Storage) {
    this.wordsSet = load(storage);
  }

  has(word: string): boolean {
    return this.wordsSet.has(word);
  }

  add(word: string): void {
    this.wordsSet.add(word);
  }

  remove(word: string): void {
    this.wordsSet.delete(word);
  }

  words(): string[] {
    return Array.from(this.wordsSet);
  }

  flush(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.words()));
    } catch {
      // Ignore storage failures (e.g. quota exceeded or disabled storage).
    }
  }
}

export function createDictionary(storage: Storage = sessionStorage): UnknownWordDictionary {
  return new Dictionary(storage);
}

export function bindPersistence(
  dictionary: UnknownWordDictionary,
  win: Window = window,
  doc: Document = document,
): void {
  const flush = (): void => dictionary.flush();
  win.addEventListener("blur", flush);
  win.addEventListener("pagehide", flush);
  win.addEventListener("beforeunload", flush);
  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "hidden") flush();
  });
}
