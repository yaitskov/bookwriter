import type { EpubBook } from "./epub.js";
import { AsyncTokenFactory, type AsyncToken } from "./async-token.js";
import { Messages, Info, Warning } from "./messages.js";
import { Scroll, ToAnchor, ToEnd, ToStart, type ScrollTo } from "./scroll-to.js";
import { parseEpubBook } from "./epub.js";
import { type LoadingModal } from "./loading-modal.js";
import { loadBookFile } from "./book-loader.js";
import { type NavMenu } from "./nav-menu.js";
import { type SettingsDialog } from "./settings-dialog.js";
import { type HelpDialog } from "./help-dialog.js";
import type { KnownWordDictionary } from "./known-word-dictionary.js";
import type { UnknownWordDictionary } from "./unknown-word-dictionary.js";
import type { Thesaurus } from "./thesaurus.js";
import { wrapWord, applySynonym, restoreAllOccurrences } from "./word-span.js";
import { extractSentence } from "./sentence.js";

const CAMBRIDGE_BASE = "https://dictionary.cambridge.org/dictionary/english/";
import { popups, hideAll } from "./menu/popup.js";
import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { resolveLinkTarget } from "./hyperlink.js";

export type ClickedLink = { href: string; fromIndex: number }

export class App {
  public openBookBlob : Uint8Array;
  public openBook : EpubBook;
  public openBookItemIndex : number;
  public openBookItemRendered : number;
  public readonly tokenFactory : AsyncTokenFactory;
  public readonly settingsDialog: SettingsDialog;
  public readonly helpDialog: HelpDialog;
  public readonly messages : Messages;
  private bookItemOutput: HTMLDivElement;
  public readonly scroller: Scroll;
  private c2welcome: HTMLElement;
  private navMenu: NavMenu;
  public readonly loadingModal: LoadingModal;
  private doc: Document;
  private win: Window;
  public clicked: ClickedWord;
  public clickedLink: ClickedLink | null;
  public synonymSpan: HTMLSpanElement | null;
  public readonly known: KnownWordDictionary;
  public readonly unknown: UnknownWordDictionary;
  public readonly thesaurus: Thesaurus;

  constructor(doc: Document, win: Window, tokenFactory: AsyncTokenFactory,
              loadingModal: LoadingModal,
              c2welcome: HTMLElement, navMenu: NavMenu,
              scroller: Scroll, bookItemOutput: HTMLDivElement,
              messages : Messages, settingsDialog: SettingsDialog,
              helpDialog: HelpDialog,
              known: KnownWordDictionary, unknown: UnknownWordDictionary,
              thesaurus: Thesaurus) {
    this.clicked =  { word: "", node: null, start: 0, end: 0 };
    this.synonymSpan = null;
    this.clickedLink = null;

    this.doc = doc;
    this.win = win;
    this.loadingModal = loadingModal;
    this.c2welcome = c2welcome;
    this.navMenu = navMenu;
    this.tokenFactory = tokenFactory;
    this.settingsDialog = settingsDialog;
    this.helpDialog = helpDialog;
    this.scroller = scroller;
    this.bookItemOutput = bookItemOutput;
    this.messages = messages;
    this.known = known;
    this.unknown = unknown;
    this.thesaurus = thesaurus;
    this.openBookBlob = new Uint8Array(0);
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
    this.navMenu.previousButton.disabled = !hasBook;
    this.navMenu.nextButton.disabled = !hasBook;
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

  public closeBook() {
    if (this.isBookClosed()) {
      this.messages.add(Warning("No book is open"));
      return;
    }

    this.openBook.items[this.openBookItemRendered]?.cleanup(this.bookItemOutput.id);
    this.openBookBlob = new Uint8Array(0);
    this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;

    this.bookItemOutput.replaceChildren();
    this.messages.add(Info("Book closed"));

    this.updateNavMenu();
    this.c2welcome.style.display = "";
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

  public loadNewBookDialog() {
    loadBookFile({ doc: this.doc })
      .then(async (bytes : Uint8Array) => {
        const token = this.tokenFactory.issue();
        this.loadingModal.show();
        try {
          await this.loadNewBook(bytes, token);
          this.updateNavMenu();
          this.c2welcome.style.display = "none";
          const { title, authors } = this.openBook;
          const by = authors.length > 0 ? ` by ${authors.join(", ")}` : "";
          this.messages.add(Info(`Loaded ${title || "book"}${by}`));
        } finally {
          token.onValid(() => this.loadingModal.hide());
        }
      })
      .catch((error) => {
        console.error("failed to open book", error);
      });
  }

  public async loadNewBook(bookBytes: Uint8Array, token : AsyncToken) {
    this.closeBookIfOpen();
    const book = await parseEpubBook(bookBytes);
    if (!token.isValid()) return;
    this.openBookBlob = bookBytes;
    this.openBook = book;
    this.openBookItemIndex = 0;
    await this.renderOpenBookItem();
    this.openBookItemRendered = 0;
  }
}
