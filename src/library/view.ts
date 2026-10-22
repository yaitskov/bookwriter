import type { Sha1 } from "../util/hash";
import type { BookLibrary, LibraryBookRecord } from "./db";

export interface BookLibraryViewOptions {
  target: HTMLElement;
  library: BookLibrary;
  onOpenBook: (contentSha: Sha1) => void;
  onOpenNewBook: () => void;
  doc?: Document;
}

export interface BookLibraryView {
  readonly element: HTMLDivElement;
  refresh(): Promise<void>;
}

function sortByUploadDesc(
  records: LibraryBookRecord[],
): LibraryBookRecord[] {
  return [...records].sort(
    (left, right) => right.uploadedToDbAt.getTime() - left.uploadedToDbAt.getTime(),
  );
}

function createCard(
  doc: Document,
  record: LibraryBookRecord,
  onOpenBook: (contentSha: Sha1) => void,
): HTMLButtonElement {
  const card = doc.createElement("button");
  card.type = "button";
  card.className = "book-card";
  const title = record.title.trim() || "Untitled";
  const authors = record.authors.trim() || "Unknown author";
  card.title = `${title} — ${authors}`;

  const titleElement = doc.createElement("span");
  titleElement.className = "book-card-title";
  titleElement.textContent = title;

  const authorElement = doc.createElement("span");
  authorElement.className = "book-card-author";
  authorElement.textContent = authors;

  card.append(titleElement, authorElement);
  card.addEventListener("click", () => onOpenBook(record.bookContentHash));
  return card;
}

function createEmptyCard(
  doc: Document,
  onOpenNewBook: () => void,
): HTMLButtonElement {
  const empty = doc.createElement("button");
  empty.type = "button";
  empty.className = "book-library-empty";
  empty.textContent = "Your library is empty. Click to open a book.";
  empty.addEventListener("click", () => onOpenNewBook());
  return empty;
}

export function createBookLibraryView(
  options: BookLibraryViewOptions,
): BookLibraryView {
  const { target, library, onOpenBook, onOpenNewBook } = options;
  const doc = options.doc ?? document;

  const panel = doc.createElement("div");
  panel.className = "book-library";

  const title = doc.createElement("h2");
  title.className = "book-library-title";

  const cards = doc.createElement("div");
  cards.className = "book-library-cards";

  panel.append(title, cards);
  target.append(panel);

  const render = (records: LibraryBookRecord[]): void => {
    const ordered = sortByUploadDesc(records);
    title.textContent = `Your library (${ordered.length})`;
    const cardElements = ordered.length > 0
      ? ordered.map((record) => createCard(doc, record, onOpenBook))
      : [createEmptyCard(doc, onOpenNewBook)];
    cards.replaceChildren(...cardElements);
  };

  const refresh = async (): Promise<void> => {
    try {
      render(await library.loadBookCards());
    } catch (error) {
      console.error("[library-view] failed to load book cards", error);
    }
  };

  void refresh();

  return { element: panel, refresh };
}
