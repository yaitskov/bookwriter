const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY = 0x06064b50;
const ZIP64_EXTRA_FIELD = 0x0001;
const CENTRAL_ENTRY = 0x02014b50;
const LOCAL_ENTRY = 0x04034b50;
const UNCOMPRESSED_SIZE_UNKNOWN = 0xffffffff;
const STORED = 0;
const DEFLATED = 8;
const CONTAINER_PATH = "META-INF/container.xml";
const TEXT_DECODER = new TextDecoder("utf-8");
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const FONT_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2", ".eot"];

export interface EpubItem {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  render(rootId: string): Promise<void>;
  cleanup(rootId: string): void;
}

export interface MediaFile {
  readonly pathRelativeToDocument: string;
  readonly content: Uint8Array;
}

export interface FontName {
  readonly name: string;
  blob: Uint8Array;
}

export interface EpubBook {
  readonly items: EpubItem[];
  readonly media: MediaFile[];
  readonly fonts: FontName[];
}

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  compressed: Uint8Array;
}

interface ManifestItem {
  path: string;
  mediaType: string;
  properties: string;
}

interface OpenEpub {
  entries: Map<string, ZipEntry>;
  read(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  readDocument(path: string): Promise<Document>;
  has(path: string): boolean;
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

function readZip(content: Uint8Array): Map<string, ZipEntry> {
  const eocd = findEndOfCentralDirectory(content);
  if (eocd < 0) throw new Error("not a zip archive: end of central directory not found");
  return readCentralDirectory(content, eocd);
}

async function inflate(compressed: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([compressed as BlobPart]).stream();
  const inflated = stream.pipeThrough(new DecompressionStream("deflate-raw"));
  return toUint8Array(await new Response(inflated).arrayBuffer());
}

function resolvePath(baseDirectory: string, href: string): string {
  const withoutFragment = href.split("#")[0].split("?")[0];
  let decoded = withoutFragment;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    decoded = withoutFragment;
  }
  const parts = (baseDirectory ? `${baseDirectory}/${decoded}` : decoded)
    .split("/")
    .filter((part) => part.length > 0 && part !== ".");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}

function directoryOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

function openEpub(content: Uint8Array): OpenEpub {
  const entries = readZip(content);
  const decoderCache = new Map<string, string>();

  const has = (path: string): boolean => entries.has(path);

  const read = async (path: string): Promise<Uint8Array> => {
    const entry = entries.get(path);
    if (!entry) throw new Error(`missing entry "${path}"`);
    if (entry.method === STORED) return entry.compressed;
    if (entry.method === DEFLATED) return inflate(entry.compressed);
    throw new Error(`unsupported compression method ${entry.method} for "${path}"`);
  };

  const readText = async (path: string): Promise<string> => {
    const cached = decoderCache.get(path);
    if (cached !== undefined) return cached;
    const text = TEXT_DECODER.decode(await read(path));
    decoderCache.set(path, text);
    return text;
  };

  const parseXml = (text: string, mediaType: DOMParserSupportedType): Document => {
    return new DOMParser().parseFromString(text, mediaType);
  };

  const readDocument = async (path: string): Promise<Document> => {
    const text = await readText(path);
    const document_ = parseXml(text, "application/xhtml+xml");
    const body = document_.getElementsByTagNameNS("*", "body")[0];
    if (document_.getElementsByTagName("parsererror").length > 0 || !body) {
      const fallback = parseXml(text, "text/html");
      if (fallback.getElementsByTagName("parsererror").length === 0 && fallback.body) return fallback;
    }
    return document_;
  };

  return { entries, read, readText, readDocument, has };
}

function findAll(node: Document | Element, localName: string): Element[] {
  return Array.from(node.getElementsByTagNameNS("*", localName));
}

function findFirst(node: Document | Element, localName: string): Element | null {
  return node.getElementsByTagNameNS("*", localName)[0] ?? null;
}

function findSpineTocPath(document_: Document, manifest: Map<string, ManifestItem>): string | null {
  const spine = findFirst(document_, "spine");
  const tocId = spine?.getAttribute("toc");
  if (!tocId) return null;
  return manifest.get(tocId)?.path ?? null;
}

function findNavDocumentPath(manifest: Map<string, ManifestItem>): string | null {
  for (const item of manifest.values()) {
    if (item.properties.split(/\s+/).includes("nav")) return item.path;
  }
  return null;
}

function readNcxTitles(text: string, directory: string): Map<string, string> {
  const titles = new Map<string, string>();
  const document_ = new DOMParser().parseFromString(text, "application/xml");
  if (document_.getElementsByTagName("parsererror").length > 0) return titles;
  for (const navPoint of findAll(document_, "navPoint")) {
    const content = findFirst(navPoint, "content");
    const src = content?.getAttribute("src");
    if (!src) continue;
    const label = findFirst(navPoint, "navLabel");
    const labelText = label ? findFirst(label, "text")?.textContent?.trim() : undefined;
    if (!labelText) continue;
    const path = resolvePath(directory, src);
    if (!titles.has(path)) titles.set(path, labelText);
  }
  return titles;
}

function readNavTitles(text: string, directory: string): Map<string, string> {
  const titles = new Map<string, string>();
  const document_ = new DOMParser().parseFromString(text, "application/xhtml+xml");
  if (document_.getElementsByTagName("parsererror").length > 0) return titles;
  const navs = findAll(document_, "nav");
  const toc = navs.find((nav) => {
    const type = nav.getAttributeNS("http://www.idpf.org/2007/ops", "type") ?? nav.getAttribute("epub:type");
    return type === "toc";
  });
  const list = toc ?? document_.documentElement;
  for (const anchor of findAll(list, "a")) {
    const href = anchor.getAttribute("href");
    if (!href) continue;
    const label = anchor.textContent?.trim();
    if (!label) continue;
    const path = resolvePath(directory, href);
    if (!titles.has(path)) titles.set(path, label);
  }
  return titles;
}

function readTitles(epub: OpenEpub, manifest: Map<string, ManifestItem>, opf: Document, directory: string): Promise<Map<string, string>> {
  const ncxPath = findSpineTocPath(opf, manifest);
  if (ncxPath && epub.has(ncxPath)) {
    return epub.readText(ncxPath).then((text) => readNcxTitles(text, directoryOf(ncxPath)));
  }
  const navPath = findNavDocumentPath(manifest);
  if (navPath && epub.has(navPath)) {
    return epub.readText(navPath).then((text) => readNavTitles(text, directoryOf(navPath)));
  }
  return Promise.resolve(new Map<string, string>());
}

async function findPackagePath(epub: OpenEpub): Promise<string> {
  if (epub.has(CONTAINER_PATH)) {
    const container = await epub.readText(CONTAINER_PATH);
    const document_ = new DOMParser().parseFromString(container, "application/xml");
    if (document_.getElementsByTagName("parsererror").length === 0) {
      const rootfile = findFirst(document_, "rootfile");
      const fullPath = rootfile?.getAttribute("full-path");
      if (fullPath) {
        const path = resolvePath("", fullPath);
        if (epub.has(path)) return path;
      }
    }
  }
  for (const name of epub.entries.keys()) {
    if (name.toLowerCase().endsWith(".opf")) return name;
  }
  throw new Error("no package document (.opf) found");
}

function createEpubItem(
  id: string,
  href: string,
  title: string,
  epub: OpenEpub,
  mediaByPath: Map<string, MediaFile>,
): EpubItem {
  let styles: HTMLStyleElement[] = [];
  let objectUrls: string[] = [];
  let renderedRootId: string | null = null;

  const removeStyles = (): void => {
    for (const style of styles) style.remove();
    styles = [];
  };

  const revokeObjectUrls = (): void => {
    for (const url of objectUrls) window.URL.revokeObjectURL(url);
    objectUrls = [];
  };

  const inlineStyles = async (document_: Document): Promise<void> => {
    const directory = directoryOf(href);
    const links = Array.from(document_.getElementsByTagNameNS("*", "link")).filter((link) => {
      const rel = link.getAttribute("rel") ?? "";
      return rel.split(/\s+/).includes("stylesheet") && link.hasAttribute("href");
    });
    for (const link of links) {
      const rawHref = link.getAttribute("href") ?? "";
      const path = resolvePath(directory, rawHref);
      let css: string;
      try {
        css = await epub.readText(path);
      } catch (error) {
        console.warn(`[epub] skipping stylesheet "${path}": ${String(error)}`);
        continue;
      }
      const style = document.createElement("style");
      style.dataset.epubItem = id;
      style.textContent = css;
      document.head.appendChild(style);
      styles.push(style);
    }
  };

  const applyImageUrl = (
    base: string,
    reference: string,
    setUrl: (url: string) => void,
  ): void => {
    if (isExternalReference(reference)) return;
    const target = resolvePath(base, reference);
    const media = mediaByPath.get(target);
    if (!media) {
      console.warn(`[epub] skipping image "${reference}" in "${href}": no matching media`);
      return;
    }
    const url = window.URL.createObjectURL(
      new Blob([media.content as BlobPart], { type: mimeForImage(target) }),
    );
    objectUrls.push(url);
    setUrl(url);
  };

  const inlineImages = (document_: Document): void => {
    const base = directoryOf(dropTopFolder(href));
    for (const image of findAll(document_, "img")) {
      const reference = image.getAttribute("src");
      if (reference) applyImageUrl(base, reference, (url) => image.setAttribute("src", url));
    }
    for (const image of findAll(document_, "image")) {
      const xlink = image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (xlink !== null) {
        applyImageUrl(base, xlink, (url) =>
          image.setAttributeNS("http://www.w3.org/1999/xlink", "href", url));
        continue;
      }
      const plain = image.getAttribute("href");
      if (plain) applyImageUrl(base, plain, (url) => image.setAttribute("href", url));
    }
  };

  const render = async (rootId: string): Promise<void> => {
    const root = document.getElementById(rootId);
    if (!root) throw new Error(`no element with id "${rootId}"`);
    removeStyles();
    revokeObjectUrls();
    const document_ = await epub.readDocument(href);
    await inlineStyles(document_);
    inlineImages(document_);
    root.replaceChildren();
    for (const child of Array.from(document_.body?.childNodes ?? [])) {
      root.appendChild(document.importNode(child, true));
    }
    renderedRootId = rootId;
  };

  const cleanup = (rootId: string): void => {
    revokeObjectUrls();
    if (styles.length > 0) {
      removeStyles();
    } else {
      for (const style of Array.from(document.head.querySelectorAll<HTMLStyleElement>(`style[data-epub-item="${CSS.escape(id)}"]`))) {
        style.remove();
      }
    }
    document.getElementById(rootId)?.replaceChildren();
    if (renderedRootId === rootId) renderedRootId = null;
  };

  return { id, href, title, render, cleanup };
}

function isImageEntry(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function isFontEntry(name: string): boolean {
  const lower = name.toLowerCase();
  return FONT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

const IMAGE_MIME_TYPES: { [extension: string]: string } = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function mimeForImage(path: string): string {
  const lower = path.toLowerCase();
  for (const [extension, type] of Object.entries(IMAGE_MIME_TYPES)) {
    if (lower.endsWith(extension)) return type;
  }
  return "application/octet-stream";
}

function isExternalReference(reference: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(reference)
    || reference.startsWith("//")
    || reference.startsWith("#");
}

const DOCUMENT_ROOT_FOLDERS = ["epub", "oebps"];

function dropTopFolder(path: string): string {
  const slash = path.indexOf("/");
  if (slash < 0) return path;
  const top = path.slice(0, slash);
  return top === ".." || DOCUMENT_ROOT_FOLDERS.includes(top.toLowerCase())
    ? path.slice(slash + 1)
    : path;
}

export async function parseEpubBook(content: Uint8Array): Promise<EpubBook> {
  const epub = openEpub(content);
  const packagePath = await findPackagePath(epub);
  const directory = directoryOf(packagePath);
  const opf = await epub.readDocument(packagePath);

  const manifest = new Map<string, ManifestItem>();
  for (const item of findAll(opf, "item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(directory, href),
      mediaType: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties") ?? "",
    });
  }

  const titles = await readTitles(epub, manifest, opf, directory);

  const media = await Promise.all(
    Array.from(epub.entries.keys())
      .filter(isImageEntry)
      .map(async (name) => ({ pathRelativeToDocument: dropTopFolder(name), content: await epub.read(name) })),
  );
  const mediaByPath = new Map(media.map((file) => [file.pathRelativeToDocument, file]));

  const fonts = await Promise.all(
    Array.from(epub.entries.keys())
      .filter(isFontEntry)
      .map(async (name) => ({ name: dropTopFolder(name), blob: await epub.read(name) })),
  );

  const spine = findFirst(opf, "spine");
  const items: EpubItem[] = [];
  for (const itemref of findAll(spine ?? opf, "itemref")) {
    const idref = itemref.getAttribute("idref");
    if (!idref) continue;
    const item = manifest.get(idref);
    if (!item) continue;
    items.push(createEpubItem(idref, item.path, titles.get(item.path) ?? "", epub, mediaByPath));
  }

  if (items.length === 0) throw new Error(`no spine items in "${packagePath}"`);

  return { items, media, fonts };
}
