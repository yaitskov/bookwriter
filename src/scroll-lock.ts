const LOCK_CLASS = "dialog-open";

const locks = new WeakMap<Document, number>();

export function lockScroll(doc: Document = document): void {
  const count = locks.get(doc) ?? 0;
  locks.set(doc, count + 1);
  if (count === 0) doc.body.classList.add(LOCK_CLASS);
}

export function unlockScroll(doc: Document = document): void {
  const count = locks.get(doc) ?? 0;
  if (count === 0) return;
  const next = count - 1;
  locks.set(doc, next);
  if (next === 0) doc.body.classList.remove(LOCK_CLASS);
}
