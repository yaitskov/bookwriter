import { resolveHref, type EpubBook } from "./epub.js";

export type LinkTarget =
  | { kind: "external"; url: string }
  | { kind: "local"; index: number; anchor?: string }
  | { kind: "unresolved"; path: string };

const EXTERNAL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function isExternalLink(href: string): boolean {
  return EXTERNAL_SCHEME.test(href) || href.startsWith("//");
}

export function resolveLinkTarget(
  book: EpubBook,
  fromIndex: number,
  rawHref: string,
): LinkTarget {
  if (isExternalLink(rawHref)) {
    const url = rawHref.startsWith("//") ? `https:${rawHref}` : rawHref;
    return { kind: "external", url };
  }
  const fromHref = book.items[fromIndex]?.href ?? "";
  const hashIndex = rawHref.indexOf("#");
  const anchor =
    hashIndex >= 0 ? decodeURIComponent(rawHref.slice(hashIndex + 1)) : "";
  const path = rawHref.startsWith("#") ? fromHref : resolveHref(fromHref, rawHref);
  const index = book.items.findIndex((item) => item.href === path);
  if (index < 0) return { kind: "unresolved", path };
  return { kind: "local", index, anchor: anchor || undefined };
}
