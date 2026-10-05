import { createWordDictionary, type WordDictionary } from "./word-dictionary.js";

const STORAGE_KEY = "unknown-word-dictionary";

export type UnknownWordDictionary = WordDictionary;

export function createUnknownWordDictionary(
  storage: Storage = sessionStorage,
): UnknownWordDictionary {
  return createWordDictionary(STORAGE_KEY, storage);
}
