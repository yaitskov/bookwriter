import type { ClickedWord } from "./clicked-word.js";
import { extractSentence } from "./sentence.js";
import { createThesaurus, type Thesaurus } from "./thesaurus.js";
import { applySynonym, wrapWord } from "./word-span.js";

const SKIP_SELECTOR = ".unknown-word, .synonym, .word-menu";

export interface BulkSynonymOptions {
  thesaurus?: Thesaurus;
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
