import type { EpubBook } from "../epub";
import { CONTENT, META, Sha1, type DB } from "../db/index";

export type LibraryBookRecord = {
  readonly bookContentHash: Sha1;
  readonly title: string;
  readonly authors: string;
  readonly uploadedToDbAt: Date;
};

export interface BookLibrary {
  addBook(
    book: EpubBook,
    bookBlob: Uint8Array<ArrayBuffer>,
  ): Promise<LibraryBookRecord>;
  loadAllBookShas(): Promise<Sha1[]>;
  loadBookCards(): Promise<LibraryBookRecord[]>;
  getBookCard(contentSha: Sha1): Promise<LibraryBookRecord>;
  getBookContent(contentSha: Sha1): Promise<Uint8Array>;
  removeBook(contentSha: Sha1): Promise<void>;
  clear(): Promise<void>;
}

type StoredBookRecord = {
  bookContentHash: string;
  title: string;
  authors: string;
  uploadedToDbAt: Date;
};

function parseStoredBookRecord(value: unknown): LibraryBookRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Partial<StoredBookRecord>;
  if (
    typeof record.bookContentHash !== "string" ||
    typeof record.title !== "string" ||
    typeof record.authors !== "string" ||
    !(record.uploadedToDbAt instanceof Date)
  ) {
    return null;
  }
  try {
    return {
      bookContentHash: Sha1.fromHex(record.bookContentHash),
      title: record.title,
      authors: record.authors,
      uploadedToDbAt: record.uploadedToDbAt,
    };
  } catch {
    return null;
  }
}

function toStoredBookRecord(record: LibraryBookRecord): StoredBookRecord {
  return {
    bookContentHash: record.bookContentHash.hex,
    title: record.title,
    authors: record.authors,
    uploadedToDbAt: record.uploadedToDbAt,
  };
}

class Library implements BookLibrary {
  constructor(private readonly db: DB) {}

  async addBook(
    book: EpubBook,
    bookBlob: Uint8Array<ArrayBuffer>,
  ): Promise<LibraryBookRecord> {
    const bookContentHash = await this.db.store(bookBlob);
    const record: LibraryBookRecord = {
      bookContentHash,
      title: book.title,
      authors: book.authors.join(", "),
      uploadedToDbAt: new Date(),
    };
    await this.db.putRecord(META, bookContentHash, toStoredBookRecord(record));
    return record;
  }

  async loadAllBookShas(): Promise<Sha1[]> {
    return this.db.listSha1s(META);
  }

  async loadBookCards(): Promise<LibraryBookRecord[]> {
    const stored = await this.db.listRecords(META);
    return stored
      .map(parseStoredBookRecord)
      .filter((record): record is LibraryBookRecord => record !== null);
  }

  async getBookCard(contentSha: Sha1): Promise<LibraryBookRecord> {
    const stored = await this.db.getRecord<unknown>(META, contentSha);
    const record = parseStoredBookRecord(stored);
    if (!record) {
      throw new Error(`[library] book card not found: ${contentSha}`);
    }
    return record;
  }

  async getBookContent(contentSha: Sha1): Promise<Uint8Array> {
    return this.db.loadBySha1(contentSha);
  }

  async removeBook(contentSha: Sha1): Promise<void> {
    return this.db.removeRecords([CONTENT, META], contentSha);
  }

  async clear(): Promise<void> {
    return this.db.clearTables([CONTENT, META]);
  }
}

export function createBookLibrary(db: DB): BookLibrary {
  return new Library(db);
}
