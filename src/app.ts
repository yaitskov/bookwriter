import type { EpubBook } from "./epub.js";
import { AsyncTokenFactory, type AsyncToken } from "./async-token.js";
import { Messages, Info, Warning } from "./messages.js";
import { Scroll, ToAnchor, ToEnd, ToStart, type ScrollTo } from "./scroll-to.js";
import { parseEpubBook } from "./epub.js";
import { type LoadingModal } from "./loading-modal.js";
import { loadBookFile } from "./book-loader.js";
import { type NavMenu } from "./nav-menu.js";

export class App {
  public openBookBlob : Uint8Array;
  public openBook : EpubBook;
  public openBookItemIndex : number;
  public openBookItemRendered : number;
  public readonly tokenFactory : AsyncTokenFactory;
  private messages : Messages;
  private bookItemOutput: HTMLDivElement;
  private scroller: Scroll;
  private c2welcome: HTMLElement;
  private navMenu: NavMenu;
  private loadingModal: LoadingModal;
  private doc: Document;

  constructor(doc: Document, tokenFactory: AsyncTokenFactory,
              loadingModal: LoadingModal,
              c2welcome: HTMLElement, navMenu: NavMenu,
              scroller: Scroll, bookItemOutput: HTMLDivElement,
              messages : Messages) {
    this.doc = doc;
    this.loadingModal = loadingModal;
    this.c2welcome = c2welcome;
    this.navMenu = navMenu;
    this.tokenFactory = tokenFactory;
    this.scroller = scroller;
    this.bookItemOutput = bookItemOutput;
    this.messages = messages;
    this.openBookBlob = new Uint8Array(0);
    this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;
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
