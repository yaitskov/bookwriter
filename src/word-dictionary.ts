export interface WordDictionary {
  has(word: string): boolean;
  add(word: string): void;
  remove(word: string): void;
  words(): string[];
  flush(): void;
}

function normalize(word: string): string {
  return word.toLowerCase();
}

function load(storage: Storage, key: string): Set<string> {
  try {
    const raw = storage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .filter((word): word is string => typeof word === "string")
        .map((word) => normalize(word)),
    );
  } catch {
    return new Set();
  }
}

class Dictionary implements WordDictionary {
  private readonly wordsSet: Set<string>;

  constructor(
    private readonly storage: Storage,
    private readonly key: string,
  ) {
    this.wordsSet = load(storage, key);
  }

  has(word: string): boolean {
    return this.wordsSet.has(normalize(word));
  }

  add(word: string): void {
    this.wordsSet.add(normalize(word));
  }

  remove(word: string): void {
    this.wordsSet.delete(normalize(word));
  }

  words(): string[] {
    return Array.from(this.wordsSet);
  }

  flush(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.words()));
    } catch {
      // Ignore storage failures (e.g. quota exceeded or disabled storage).
    }
  }
}

export function createWordDictionary(
  key: string,
  storage: Storage = sessionStorage,
): WordDictionary {
  return new Dictionary(storage, key);
}

export function bindPersistence(
  dictionary: WordDictionary,
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
