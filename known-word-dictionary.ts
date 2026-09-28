import { createWordDictionary, type WordDictionary } from "./word-dictionary.js";

const STORAGE_KEY = "known-word-dictionary";

export type KnownWordDictionary = WordDictionary;

export function createKnownWordDictionary(
  storage: Storage = sessionStorage,
): KnownWordDictionary {
  return createWordDictionary(STORAGE_KEY, storage);
}
