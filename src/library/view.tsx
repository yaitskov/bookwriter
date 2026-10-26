import "./library.css";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { Sha1 } from "../util/hash";
import type { BookLibrary, LibraryBookRecord } from "./db";

export interface BookLibraryViewHandle {
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
  library: BookLibrary;
  onOpenBook: (contentSha: Sha1) => void;
  onOpenNewBook: () => void;
  ref?: React.Ref<BookLibraryViewHandle>;
}

export function BookLibraryView({
  library,
  onOpenBook,
  onOpenNewBook,
  ref,
}: BookLibraryViewProps): React.JSX.Element {
  const [records, setRecords] = useState<readonly LibraryBookRecord[]>([]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setRecords(await library.loadBookCards());
    } catch (error) {
      console.error("[library-view] failed to load book cards", error);
    }
  }, [library]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
