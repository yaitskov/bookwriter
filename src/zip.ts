const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY = 0x06064b50;
const ZIP64_EXTRA_FIELD = 0x0001;
const CENTRAL_ENTRY = 0x02014b50;
const LOCAL_ENTRY = 0x04034b50;
const UNCOMPRESSED_SIZE_UNKNOWN = 0xffffffff;
const STORED = 0;
const DEFLATED = 8;
export const TEXT_DECODER = new TextDecoder("utf-8");

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  compressed: Uint8Array;
}

function toUint8Array(data: ArrayBuffer): Uint8Array {
  return new Uint8Array(data);
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function zip64Value(view: DataView, offset: number, size: number): number | null {
  const end = offset + size;
  let position = offset;
  while (position + 4 <= end) {
    const id = view.getUint16(position, true);
    const length = view.getUint16(position + 2, true);
    if (id === ZIP64_EXTRA_FIELD) {
      const fields = Math.floor(length / 8);
      for (let field = 0; field < fields; field++) {
        const value = view.getUint32(position + 4 + field * 8, true);
        if (value !== 0xffffffff) return value;
      }
      return null;
    }
    position += 4 + length;
  }
  return null;
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = viewOf(bytes);
  const start = Math.max(0, bytes.byteLength - 0x10000 - 22);
  for (let offset = bytes.byteLength - 22; offset >= start; offset--) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  return -1;
}

function readCentralDirectoryOffset(bytes: Uint8Array, eocd: number): number {
  const view = viewOf(bytes);
  const locator = eocd - 20;
  if (locator < 0) return view.getUint32(eocd + 16, true);
  if (view.getUint32(locator, true) !== ZIP64_LOCATOR) return view.getUint32(eocd + 16, true);
  const zip64 = Number(view.getBigUint64(locator + 8, true));
  if (zip64 < 0 || zip64 + 56 > bytes.byteLength) return view.getUint32(eocd + 16, true);
  if (view.getUint32(zip64, true) !== ZIP64_END_OF_CENTRAL_DIRECTORY) {
    return view.getUint32(eocd + 16, true);
  }
  return Number(view.getBigUint64(zip64 + 48, true));
}

function readCentralDirectory(bytes: Uint8Array, eocd: number): Map<string, ZipEntry> {
  const view = viewOf(bytes);
  const entries = new Map<string, ZipEntry>();
  let offset = readCentralDirectoryOffset(bytes, eocd);
  const count = view.getUint16(eocd + 10, true);

  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.byteLength) break;
    if (view.getUint32(offset, true) !== CENTRAL_ENTRY) break;
    const method = view.getUint16(offset + 10, true);
    let compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = TEXT_DECODER.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (compressedSize === UNCOMPRESSED_SIZE_UNKNOWN) {
      compressedSize = zip64Value(view, offset + 46 + nameLength, extraLength) ?? compressedSize;
    }
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;
    if (compressedSize === 0) {
      entries.set(name, { name, method: STORED, compressedSize: 0, compressed: new Uint8Array(0) });
      continue;
    }
    if (localOffset + 30 > bytes.byteLength) continue;
    if (view.getUint32(localOffset, true) !== LOCAL_ENTRY) continue;
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > bytes.byteLength) continue;
    entries.set(name, {
      name,
      method,
      compressedSize,
      compressed: bytes.subarray(dataOffset, dataOffset + compressedSize),
    });
  }

  return entries;
}

export function readZip(content: Uint8Array): Map<string, ZipEntry> {
  const eocd = findEndOfCentralDirectory(content);
  if (eocd < 0) throw new Error("not a zip archive: end of central directory not found");
  return readCentralDirectory(content, eocd);
}

async function inflate(compressed: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([compressed as BlobPart]).stream();
  const inflated = stream.pipeThrough(new DecompressionStream("deflate-raw"));
  return toUint8Array(await new Response(inflated).arrayBuffer());
}

export async function readZipEntry(entry: ZipEntry): Promise<Uint8Array> {
  if (entry.method === STORED) return entry.compressed;
  if (entry.method === DEFLATED) return inflate(entry.compressed);
  throw new Error(`unsupported compression method ${entry.method} for "${entry.name}"`);
}
