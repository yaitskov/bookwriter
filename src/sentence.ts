export const BLOCK_SELECTOR = "p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote";

export function extractSentence(span: HTMLSpanElement): string {
  const block = span.closest(BLOCK_SELECTOR);
  if (!block) return span.textContent ?? "";

  const full = block.textContent ?? "";
  const isTerminator = (ch: string): boolean =>
    ch === "." || ch === "!" || ch === "?";

  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(span, 0);
  const spanStart = range.toString().length;
  const spanEnd = spanStart + (span.textContent?.length ?? 0);

  let sentenceStart = 0;
  for (let i = spanStart - 1; i >= 0; i--) {
    if (isTerminator(full[i])) {
      sentenceStart = i + 1;
      break;
    }
  }

  let sentenceEnd = full.length;
  for (let i = spanEnd; i < full.length; i++) {
    if (isTerminator(full[i])) {
      sentenceEnd = i + 1;
      break;
    }
  }

  const before = full.slice(sentenceStart, spanStart);
  const after = full.slice(spanEnd, sentenceEnd);
  return before + (span.textContent ?? "") + after;
}
