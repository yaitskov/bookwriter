import type { ClickedWord } from "./clicked-word.js";

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function wrapWord({ node, start, end, word }: ClickedWord): HTMLSpanElement | null {
  if (!node || !node.parentNode) return null;
  node.splitText(end);
  const middle = node.splitText(start);
  const span = document.createElement("span");
  span.className = "unknown-word";
  span.dataset.originWord = word;
  span.textContent = word;
  node.parentNode.replaceChild(span, middle);
  return span;
}

export function applySynonym(
  span: HTMLSpanElement,
  synonym: string,
  capitalize = false,
): void {
  span.textContent = capitalize ? capitalizeFirst(synonym) : synonym;
  span.classList.remove("unknown-word");
  span.classList.add("synonym");
}
