export function extractSentence(span: HTMLSpanElement): string {
  const p = span.parentElement;
  if (!(p instanceof HTMLParagraphElement)) return span.textContent ?? "";

  const full = p.textContent ?? "";
  const isTerminator = (ch: string): boolean =>
    ch === "." || ch === "!" || ch === "?";

  let offset = 0;
  let spanStart = -1;
  let spanEnd = -1;
  for (const child of Array.from(p.childNodes)) {
    const len = child.textContent?.length ?? 0;
    if (child === span) {
      spanStart = offset;
      spanEnd = offset + len;
      break;
    }
    offset += len;
  }
  if (spanStart === -1) return span.textContent ?? "";

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
