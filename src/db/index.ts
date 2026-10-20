import { Sha1 } from "../util/hash.js";

export { Sha1 };

export interface DB {
  store(blob: Uint8Array<ArrayBuffer>): Promise<Sha1>;
  loadBySha1(key: Sha1): Promise<Uint8Array>;
}

const BLOBS = "blobs";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("[sql] indexeddb request failed")),
    );
  });
}

function openDatabase(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(BLOBS)) {
        database.createObjectStore(BLOBS);
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
    const transaction = database.transaction(BLOBS, "readwrite");
    await requestToPromise(transaction.objectStore(BLOBS).put(blob, sha1.hex));
    return sha1;
  }

  async loadBySha1(key: Sha1): Promise<Uint8Array> {
    const database = await this.database;
    const transaction = database.transaction(BLOBS, "readonly");
    const result = await requestToPromise<unknown>(
      transaction.objectStore(BLOBS).get(key.hex),
    );
    if (!(result instanceof Uint8Array)) {
      throw new Error(`[sql] blob not found: ${key}`);
    }
    return result;
  }
}

export function initDb(dbName: string): DB {
  return new SqlDb(dbName);
}
