import { extractBookContent } from "./BookExtraction.js";
import { filterOutKnownWords, type BulkSynonym } from "./bulk-synonym.js";
import type { UnknownWordDictionary } from "./dictionary.js";

export interface BulkRunOptions {
  bulk: BulkSynonym;
  dictionary: UnknownWordDictionary;
  root?: ParentNode;
  now?: () => number;
  log?: (message: string) => void;
  error?: (message: string) => void;
}

export interface BulkRunStats {
  total: number;
  completed: number;
  failed: number;
  word: string;
  replaced: number;
  elapsedMs: number;
  totalMs: number;
  averageMsPerWord: number;
  remainingMs: number;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${String(restSeconds).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function formatStats(stats: BulkRunStats): string {
  const parts = [
    `[bulk] ${stats.completed}/${stats.total} "${stats.word}"`,
    `${stats.replaced} replaced`,
    `avg ${formatDuration(stats.averageMsPerWord)}/word`,
    `ETA ${formatDuration(stats.remainingMs)} left`,
  ];
  if (stats.failed > 0) parts.push(`${stats.failed} failed`);
  return parts.join(" · ");
}

export async function runBulkSynonym(options: BulkRunOptions): Promise<BulkRunStats[]> {
  const { bulk, dictionary } = options;
  const root = options.root ?? document.body;
  const now = options.now ?? (() => performance.now());
  const log = options.log ?? ((message: string) => console.log(message));
  const error = options.error ?? ((message: string) => console.error(message));

  const words = filterOutKnownWords(extractBookContent(root), dictionary);
  log(`[bulk] ${words.length} unknown word(s) found`);

  const stats: BulkRunStats[] = [];
  const started = now();
  let failed = 0;

  for (const [index, word] of words.entries()) {
    const wordStart = now();
    let replaced = 0;
    let wordError: unknown = null;
    try {
      replaced = await bulk.replaceAll(word, root);
    } catch (caught) {
      wordError = caught;
      failed++;
    }
    const totalMs = now() - started;
    const completed = index + 1;
    const averageMsPerWord = totalMs / completed;
    const current: BulkRunStats = {
      total: words.length,
      completed,
      failed,
      word,
      replaced,
      elapsedMs: now() - wordStart,
      totalMs,
      averageMsPerWord,
      remainingMs: (words.length - completed) * averageMsPerWord,
    };
    stats.push(current);
    if (wordError) error(`[bulk] "${word}" failed: ${String(wordError)}`);
    log(formatStats(current));
  }

  return stats;
}
