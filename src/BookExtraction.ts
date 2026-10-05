const WORD_PATTERN = /[\w'’-]+/g;
const SKIP_SELECTOR = "span[data-origin-word], .word-menu, .settings-dialog-backdrop";

export function extractBookContent(root: ParentNode): string[] {
  const words = new Set<string>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (parent && parent.closest(SKIP_SELECTOR)) continue;

    for (const match of node.data.matchAll(WORD_PATTERN)) {
      words.add(match[0]);
    }
  }

  return Array.from(words);
}
