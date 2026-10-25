import { Sha1 } from "../util/hash";

export { Sha1 };

export const CONTENT = "content";
export const META = "meta";

export interface DB {
  store(blob: Uint8Array<ArrayBuffer>): Promise<Sha1>;
  loadBySha1(key: Sha1): Promise<Uint8Array>;
  putRecord(table: string, key: Sha1, record: unknown): Promise<void>;
  getRecord<T>(table: string, key: Sha1): Promise<T | undefined>;
  listSha1s(table: string): Promise<Sha1[]>;
  listRecords(table: string): Promise<unknown[]>;
  removeRecords(tables: string[], key: Sha1): Promise<void>;
  clearTables(tables: string[]): Promise<void>;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("[sql] indexeddb request failed")),
    );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () =>
      reject(transaction.error ?? new Error("[sql] transaction failed")),
    );
    transaction.addEventListener("abort", () =>
      reject(transaction.error ?? new Error("[sql] transaction aborted")),
    );
  });
}

function openDatabase(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      for (const table of [CONTENT, META]) {
        if (!database.objectStoreNames.contains(table)) {
          database.createObjectStore(table);
        }
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(
        request.error ?? new Error(`[sql] cannot open database: ${dbName}`),
      ),
    );
  });
}

class SqlDb implements DB {
  private readonly database: Promise<IDBDatabase>;

  constructor(dbName: string) {
    this.database = openDatabase(dbName);
  }

  async store(blob: Uint8Array<ArrayBuffer>): Promise<Sha1> {
    const sha1 = await Sha1.fromBytes(blob);
    const database = await this.database;
    const transaction = database.transaction([CONTENT], "readwrite");
    transaction.objectStore(CONTENT).put(blob, sha1.hex);
    await transactionDone(transaction);
    return sha1;
  }

  async loadBySha1(key: Sha1): Promise<Uint8Array> {
    const database = await this.database;
    const transaction = database.transaction([CONTENT], "readonly");
    const result = await requestToPromise<unknown>(
      transaction.objectStore(CONTENT).get(key.hex),
    );
    if (!(result instanceof Uint8Array)) {
      throw new Error(`[sql] blob not found: ${key}`);
    }
    return result;
  }

  async putRecord(table: string, key: Sha1, record: unknown): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction([table], "readwrite");
    transaction.objectStore(table).put(record, key.hex);
    await transactionDone(transaction);
  }

  async getRecord<T>(table: string, key: Sha1): Promise<T | undefined> {
    const database = await this.database;
    const transaction = database.transaction([table], "readonly");
    const result = await requestToPromise<unknown>(
      transaction.objectStore(table).get(key.hex),
    );
    return result as T | undefined;
  }

  async listSha1s(table: string): Promise<Sha1[]> {
    const database = await this.database;
    const transaction = database.transaction([table], "readonly");
    const keys = await requestToPromise<IDBValidKey[]>(
      transaction.objectStore(table).getAllKeys(),
    );
    return keys
      .filter((key): key is string => typeof key === "string")
      .map((key) => Sha1.fromHex(key));
  }

  async listRecords(table: string): Promise<unknown[]> {
    const database = await this.database;
    const transaction = database.transaction([table], "readonly");
    return requestToPromise<unknown[]>(
      transaction.objectStore(table).getAll(),
    );
  }

  async removeRecords(tables: string[], key: Sha1): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(tables, "readwrite");
    for (const table of tables) {
      transaction.objectStore(table).delete(key.hex);
    }
    await transactionDone(transaction);
  }

  async clearTables(tables: string[]): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(tables, "readwrite");
    for (const table of tables) {
      transaction.objectStore(table).clear();
    }
    await transactionDone(transaction);
  }
}

export function initDb(dbName: string): DB {
  return new SqlDb(dbName);
}
