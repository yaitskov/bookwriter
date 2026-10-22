import type { EpubBook } from "./epub";
import { AsyncTokenFactory, type AsyncToken } from "./async-token";
import { Messages, Info, Warning, Error } from "./messages";
import { Scroll, ToAnchor, ToEnd, ToStart, type ScrollTo } from "./scroll-to";
import { parseEpubBook } from "./epub";
import { type LoadingModal } from "./loading-modal";
import { loadBookFile } from "./book-loader";
import { type NavMenuController } from "./menu/nav/nav-menu";
import { type SettingsDialog } from "./settings-dialog";
import { type HelpDialog } from "./help-dialog";
import { type ConfirmDialog } from "./confirm-dialog";
import type { KnownWordDictionary } from "./known-word-dictionary";
import type { UnknownWordDictionary } from "./unknown-word-dictionary";
import type { Thesaurus } from "./thesaurus";
import type { BookLibrary } from "./library/db";
import type { Sha1 } from "./util/hash";
import { wrapWord, applySynonym, restoreAllOccurrences } from "./word-span";
import { extractSentence } from "./sentence";

const CAMBRIDGE_BASE = "https://dictionary.cambridge.org/dictionary/english/";
import { popups, hideAll } from "./menu/popup";
import { extractClickedWord, type ClickedWord } from "./clicked-word";
import { resolveLinkTarget } from "./hyperlink";

export type ClickedLink = { href: string; fromIndex: number }

export class App {
  public openBookBlob : Uint8Array;
  public openBook : EpubBook;
  public openBookSha1 : Sha1 | null;
  public openBookItemIndex : number;
  public openBookItemRendered : number;
  public readonly tokenFactory : AsyncTokenFactory;
  public readonly settingsDialog: SettingsDialog;
  public readonly helpDialog: HelpDialog;
  public readonly confirmDialog: ConfirmDialog;
  public onLibraryChanged?: () => void;
  public readonly messages : Messages;
  private bookItemOutput: HTMLDivElement;
  public readonly scroller: Scroll;
  private c2welcome: HTMLElement;
  private navMenu: NavMenuController;
  public readonly loadingModal: LoadingModal;
  private doc: Document;
  private win: Window;
  public clicked: ClickedWord;
  public clickedLink: ClickedLink | null;
  public synonymSpan: HTMLSpanElement | null;
  public readonly known: KnownWordDictionary;
  public readonly unknown: UnknownWordDictionary;
  public readonly thesaurus: Thesaurus;
  public readonly library: BookLibrary;

  constructor(doc: Document, win: Window, tokenFactory: AsyncTokenFactory,
              loadingModal: LoadingModal,
              c2welcome: HTMLElement,
              scroller: Scroll, bookItemOutput: HTMLDivElement,
              messages : Messages, settingsDialog: SettingsDialog,
              helpDialog: HelpDialog,
              confirmDialog: ConfirmDialog,
              known: KnownWordDictionary, unknown: UnknownWordDictionary,
              thesaurus: Thesaurus, library: BookLibrary,
              navMenu: NavMenuController) {
    this.clicked =  { word: "", node: null, start: 0, end: 0 };
    this.synonymSpan = null;
    this.clickedLink = null;
    this.navMenu = navMenu;
    this.doc = doc;
    this.win = win;
    this.loadingModal = loadingModal;
    this.c2welcome = c2welcome;

    this.tokenFactory = tokenFactory;
    this.settingsDialog = settingsDialog;
    this.helpDialog = helpDialog;
    this.confirmDialog = confirmDialog;
    this.scroller = scroller;
    this.bookItemOutput = bookItemOutput;
    this.messages = messages;
    this.known = known;
    this.unknown = unknown;
    this.thesaurus = thesaurus;
    this.library = library;
    this.openBookBlob = new Uint8Array(0);
    this.openBookSha1 = null;
    this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;
  }

  public followLink() {
    if (!this.clickedLink) return;
    const { href, fromIndex } = this.clickedLink;
    const target = resolveLinkTarget(this.openBook, fromIndex, href);
    if (target.kind === "external") {
      this.win.open(target.url, "_blank", "noopener");
    } else if (target.kind === "local") {
      const scroll = target.anchor ? ToAnchor(target.anchor) : ToStart();
      this.goToBookItem(target.index, scroll).catch((error) =>
        console.error("failed to follow link", error),
      );
    } else {
      console.warn(`[link] cannot map "${target.path}" to a book item, ignoring`);
    }
    hideAll();
  }

  public onUnknownWord(): void {
    const { word, node } = this.clicked;
    console.log(word || null);
    if (!node) return;
    const span = wrapWord(this.clicked);
    if (!span) return;
    this.known.remove(word);
    this.unknown.add(word);
    const sentence = extractSentence(span);
    console.log(sentence);
    void this.thesaurus
      .findSynonym(word, sentence)
      .then((synonym) => {
        console.log(synonym);
        applySynonym(span, synonym);
      })
      .catch((error) => console.error(error));
  }

  public onDictionary(): void {
    if (!this.synonymSpan) return;
    const word = this.synonymSpan.dataset.originWord ?? this.synonymSpan.textContent ?? "";
    this.win.open(`${CAMBRIDGE_BASE}${encodeURIComponent(word)}`, "_blank", "noopener");
  }

  public onRemembered(): void {
    if (!this.synonymSpan) return;
    const word = this.synonymSpan.dataset.originWord ?? this.synonymSpan.textContent ?? "";
    const restored = restoreAllOccurrences(word, this.bookItemOutput);
    this.unknown.remove(word);
    this.known.add(word);
    console.log(`[known] "${word}" restored ${restored} occurrence(s)`);
  }

  public updateNavMenu(): void {
    const hasBook = this.openBook.items.length > 0 && this.openBookItemIndex >= 0;
    this.navMenu.setDisabled(!hasBook);
  };

  public isBookClosed() {
    return this.openBookItemRendered < 0 || this.openBook.items.length === 0;
  }

  public async renderOpenBookItem(): Promise<void>  {
    const item = this.openBook.items[this.openBookItemIndex];
    if (!item) return;
    this.bookItemOutput.replaceChildren();
    await item.render(this.bookItemOutput.id);
  }

  public closeBookIfOpen() {
    if (this.isBookClosed()) return;
    this.closeBook();
  }

  public showTableOfContents() {
    const target = this.openBook.navigationTarget;
    if (!target) {
      this.messages.add(Warning("No table of contents found"));
      return;
    }
    void this.goToBookItem(target.index).catch((error) => {
      this.messages.add(Warning("Failed to navigate to the table of contents"));
      console.error("navigation failed", error);
    });
  }

  public closeBook() {
    if (this.isBookClosed()) {
      this.messages.add(Warning("No book is open"));
      return;
    }

    this.openBook.items[this.openBookItemRendered]?.cleanup(this.bookItemOutput.id);
    this.openBookBlob = new Uint8Array(0);
    this.openBookSha1 = null;
    this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;
    this.setTabTitle(null);
    this.bookItemOutput.replaceChildren();
    this.bookItemOutput.classList.add('hidden');
    this.messages.add(Info("Book closed"));
    this.updateNavMenu();
    this.c2welcome.classList.remove('hidden');
  }

  public scrollTo(scroll: ScrollTo): void {
    if (this.openBookItemRendered > 0) {
      this.scroller.apply(scroll);
    }
  }

  public async goToBookItem(index: number, scroll: ScrollTo = ToStart()): Promise<void> {
    if (index < 0 || index >= this.openBook.items.length) return;
    if (index === this.openBookItemRendered) {
      this.scroller.apply(scroll);
      return;
    }
    this.openBook.items[this.openBookItemRendered]?.cleanup(this.bookItemOutput.id);
    this.openBookItemIndex = index;
    await this.renderOpenBookItem();
    this.openBookItemRendered = index;
    this.scroller.apply(scroll);
    this.updateNavMenu();
  }

  public navigateRelative(delta: number): void {
    const count = this.openBook.items.length;
    if (count === 0 || this.openBookItemIndex < 0) return;
    const index = (this.openBookItemIndex + delta + count) % count;
    void this.goToBookItem(index, delta < 0 ? ToEnd() : ToStart()).catch((error) =>
      console.error("navigation failed", error),
    );
  }

  private setTabTitle(t: string | null) {
    this.doc.title = t || 'E-reader (C2)';
  }

  private async openBookFromBytes(bookBytes: Uint8Array<ArrayBuffer>, token: AsyncToken): Promise<void> {
    await this.loadNewBook(bookBytes, token);
    this.updateNavMenu();
    const { title, authors } = this.openBook;
    this.setTabTitle(title);
    this.bookItemOutput.classList.remove('hidden');
    this.c2welcome.classList.add('hidden');
    const by = authors.length > 0 ? ` by ${authors.join(", ")}` : "";
    this.messages.add(Info(`Loaded ${title || "book"}${by}`));
  }

  private openBookWith(
    load: () => Promise<Uint8Array<ArrayBuffer>>,
    tag: string,
  ): void {
    const token = this.tokenFactory.issue();
    this.loadingModal.show();
    load()
      .then((bytes) => this.openBookFromBytes(bytes, token))
      .catch((error) => console.error(`failed to open book [${tag}]`, error))
      .finally(() => token.onValid(() => this.loadingModal.hide()));
  }

  public loadNewBookDialog(): void {
    this.openBookWith(() => loadBookFile({ doc: this.doc }), "file");
  }

  public openBookFromLibrary(contentSha: Sha1): void {
    this.openBookWith(
      () => this.library.getBookContent(contentSha) as Promise<Uint8Array<ArrayBuffer>>,
      "library",
    );
  }

  public async removeOpenBookFromLibrary(): Promise<void> {
    if (this.isBookClosed() || !this.openBookSha1) {
      this.messages.add(Warning("No book is open"));
      return;
    }
    const sha = this.openBookSha1;
    const title = this.openBook.title.trim() || "this book";
    const confirmed = await this.confirmDialog.show(
      `Remove “${title}” from your library?`,
    );
    if (!confirmed) return;
    try {
      await this.library.removeBook(sha);
      this.closeBook();
      this.messages.add(Info("Book removed from library"));
      this.onLibraryChanged?.();
    } catch (error) {
      console.error("[library] failed to remove book", error);
      this.messages.add(Error("Failed to remove book from library"));
    }
  }

  public async loadNewBook(bookBytes: Uint8Array<ArrayBuffer>, token : AsyncToken) {
    this.closeBookIfOpen();
    const book = await parseEpubBook(bookBytes);
    if (!token.isValid()) return;
    this.openBookBlob = bookBytes;
    this.openBook = book;
    void this.library
      .addBook(book, bookBytes)
      .then((record) => {
        this.openBookSha1 = record.bookContentHash;
        this.setTabTitle(this.openBook.title);
        this.bookItemOutput.classList.remove('hidden');
        this.c2welcome.classList.add('hidden');
        this.onLibraryChanged?.();
      })
      .catch((error) =>
        console.error("[library] failed to store opened book", error),
      );
    this.openBookItemIndex = 0;
    await this.renderOpenBookItem();
    this.openBookItemRendered = 0;
  }
}
