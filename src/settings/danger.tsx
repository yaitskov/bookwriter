import "./danger.css";
import { useState } from "react";

export interface OpenBookInfo {
  title: string;
  authors: readonly string[];
  canRemove: boolean;
}

export interface DangerActions {
  currentBook: () => OpenBookInfo | null;
  clearLibrary: () => Promise<void>;
  removeCurrentBook: () => Promise<void>;
}

export interface DangerSettingsProps {
  book: OpenBookInfo | null;
  onClearLibrary: () => Promise<void>;
  onRemoveBook: () => Promise<void>;
}

export function DangerSettings({
  book,
  onClearLibrary,
  onRemoveBook,
}: DangerSettingsProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);

  const run = (action: () => Promise<void>): void => {
    if (busy) return;
    setBusy(true);
    void action().finally(() => setBusy(false));
  };

  const title = book?.title.trim() || "Untitled";
  const authors = book?.authors.join(", ").trim() || "Unknown author";

  return (
    <section className="danger">
      <p className="danger-warning">
        These actions remove books permanently and cannot be undone.
      </p>
      <div className="danger-book">
        <h3>Open book</h3>
        {book ? (
          <>
            <p className="danger-book-title">{title}</p>
            <p className="danger-book-author">{authors}</p>
          </>
        ) : (
          <p className="danger-book-empty">No book is open.</p>
        )}
        <button
          type="button"
          className="danger-remove"
          disabled={!book?.canRemove || busy}
          onClick={() => run(onRemoveBook)}
        >
          Remove from library
        </button>
      </div>
      <button
        type="button"
        className="danger-clear"
        disabled={busy}
        onClick={() => run(onClearLibrary)}
      >
        Clear library
      </button>
    </section>
  );
}
