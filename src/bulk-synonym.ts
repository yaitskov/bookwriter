import type { ClickedWord } from "./clicked-word.js";
import type { KnownWordDictionary } from "./known-word-dictionary.js";
import type { UnknownWordDictionary } from "./unknown-word-dictionary.js";
import type { UserSettings } from "./settings.js";
import { extractSentence } from "./sentence.js";
import { createThesaurus, type Thesaurus } from "./thesaurus.js";
import { wordFrequency } from "./word-frequency.js";
import { applySynonym, restoreWord, wrapWord } from "./word-span.js";

const SKIP_SELECTOR = ".unknown-word, .synonym, .word-menu, .settings-dialog-backdrop";

export interface BulkSynonymOptions {
  thesaurus?: Thesaurus;
}

export interface WordDictionaries {
  known: KnownWordDictionary;
  unknown: UnknownWordDictionary;
}

export function filterOutKnownWords(
  words: string[],
  dictionaries: WordDictionaries,
  settings: UserSettings,
): string[] {
  const mtwf = settings.maximumTriggerWordFrequency();
  return words.filter(
    (word) =>
      !dictionaries.known.has(word) &&
      (dictionaries.unknown.has(word) ||
       wordFrequency(word) <= mtwf),
  );
}

export interface RevertResult {
  words: string[];
  occurrences: number;
}

export function restoreIneligibleSynonyms(
  root: ParentNode,
  dictionaries: WordDictionaries,
  mtwf: number,
): RevertResult {
  const spans = Array.from(
    root.querySelectorAll<HTMLSpanElement>("span.synonym[data-origin-word]"),
  );
  const reverted: string[] = [];
  let occurrences = 0;
  for (const span of spans) {
    if (!span.parentNode) continue;
    const word = (span.dataset.originWord ?? "").toLowerCase();
    if (!word) continue;
    if (dictionaries.unknown.has(word)) continue;
    if (wordFrequency(word) <= mtwf) continue;
    restoreWord(span);
    if (!reverted.includes(word)) reverted.push(word);
    occurrences++;
  }
  return { words: reverted, occurrences };
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\w'’-]/.test(ch);
}

function startsUppercase(text: string): boolean {
  const first = text.charAt(0);
  return first !== "" && first === first.toUpperCase() && first !== first.toLowerCase();
}

function findFirstMatch(root: ParentNode, word: string): ClickedWord | null {
  const target = word.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (parent && parent.closest(SKIP_SELECTOR)) continue;

    const text = node.data;
    const lower = text.toLowerCase();
    let index = lower.indexOf(target);
    while (index !== -1) {
      const before = text[index - 1];
      const after = text[index + word.length];
      if (!isWordChar(before) && !isWordChar(after)) {
        return {
          word: text.slice(index, index + word.length),
          node,
          start: index,
          end: index + word.length,
        };
      }
      index = lower.indexOf(target, index + 1);
    }
  }
  return null;
}

export class BulkSynonym {
  private readonly thesaurus: Thesaurus;

  constructor(options: BulkSynonymOptions = {}) {
    this.thesaurus = options.thesaurus ?? createThesaurus();
  }

  async replaceAll(word: string, root: ParentNode): Promise<number> {
    let count = 0;
    for (;;) {
      const match = findFirstMatch(root, word);
      if (!match) break;
      const span = wrapWord(match);
      if (!span) break;

      const sentence = extractSentence(span);
      const synonym = await this.thesaurus.findSynonym(word, sentence);
      applySynonym(span, synonym, startsUppercase(match.word));
      count++;
    }
    return count;
  }
}

export function createBulkSynonym(options: BulkSynonymOptions = {}): BulkSynonym {
  return new BulkSynonym(options);
}
