import { WFT } from "./word-frequency-table.js";

export const UNKNOWN_WORD_FREQUENCY = 1;

export function wordFrequency(word: string): number {
  return WFT[word.toLowerCase()] ?? UNKNOWN_WORD_FREQUENCY;
}
