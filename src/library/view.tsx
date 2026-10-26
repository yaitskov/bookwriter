import "./library.css";
import { createRoot } from "react-dom/client";
import type { Sha1 } from "../util/hash";
import type { BookLibrary, LibraryBookRecord } from "./db";

export interface BookLibraryViewOptions {
  target: HTMLElement;
  library: BookLibrary;
  onOpenBook: (contentSha: Sha1) => void;
  onOpenNewBook: () => void;
  doc?: Document;
}

export interface BookLibraryViewController {
  readonly element: HTMLDivElement;
  refresh(): Promise<void>;
}

function sortByUploadDesc(
  records: readonly LibraryBookRecord[],
): LibraryBookRecord[] {
  return [...records].sort(
    (left, right) => right.uploadedToDbAt.getTime() - left.uploadedToDbAt.getTime(),
  );
}

export interface BookCardProps {
  record: LibraryBookRecord;
  onOpenBook: (contentSha: Sha1) => void;
}

function BookCard({ record, onOpenBook }: BookCardProps): React.JSX.Element {
  const title = record.title.trim() || "Untitled";
  const authors = record.authors.trim() || "Unknown author";
  return (
    <button
      type="button"
      className="book-card"
      title={`${title} — ${authors}`}
      onClick={() => onOpenBook(record.bookContentHash)}
    >
      <span className="book-card-title">{title}</span>
      <span className="book-card-author">{authors}</span>
    </button>
  );
}

export interface EmptyLibraryCardProps {
  onOpenNewBook: () => void;
}

function EmptyLibraryCard({
  onOpenNewBook,
}: EmptyLibraryCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="book-library-empty"
      onClick={onOpenNewBook}
    >
      Your library is empty. Click to open a book.
    </button>
  );
}

export interface BookLibraryViewProps {
  records: readonly LibraryBookRecord[];
  onOpenBook: (contentSha: Sha1) => void;
  onOpenNewBook: () => void;
}

export function BookLibraryView({
  records,
  onOpenBook,
  onOpenNewBook,
}: BookLibraryViewProps): React.JSX.Element {
  const ordered = sortByUploadDesc(records);
  return (
    <div className="book-library">
      <h2 className="book-library-title">{`Your library (${ordered.length})`}</h2>
      <div className="book-library-cards">
        {ordered.length > 0
          ? ordered.map((record) => (
              <BookCard
                key={record.bookContentHash.hex}
                record={record}
                onOpenBook={onOpenBook}
              />
            ))
          : <EmptyLibraryCard onOpenNewBook={onOpenNewBook} />}
      </div>
    </div>
  );
}

export function createBookLibraryView(
  options: BookLibraryViewOptions,
): BookLibraryViewController {
  const { target, library, onOpenBook, onOpenNewBook } = options;
  const doc = options.doc ?? document;

  const host = doc.createElement("div");
  target.append(host);
  const root = createRoot(host);

  let records: readonly LibraryBookRecord[] = [];

  const render = (): void => {
    root.render(
      <BookLibraryView
        records={records}
        onOpenBook={onOpenBook}
        onOpenNewBook={onOpenNewBook}
      />,
    );
  };

  const refresh = async (): Promise<void> => {
    try {
      records = await library.loadBookCards();
      render();
    } catch (error) {
      console.error("[library-view] failed to load book cards", error);
    }
  };

  render();
  void refresh();

  return { element: host, refresh };
}
