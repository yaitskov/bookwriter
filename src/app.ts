import type { EpubBook } from "./epub.js";
import { AsyncTokenFactory, type AsyncToken } from "./async-token.js";
import { Messages, Info, Warning } from "./messages.js";
import { Scroll, ToAnchor, ToEnd, ToStart, type ScrollTo } from "./scroll-to.js";
import { parseEpubBook } from "./epub.js";

export class App {
  public openBookBlob : Uint8Array;
  public openBook : EpubBook;
  public openBookItemIndex : number;
  public openBookItemRendered : number;
  public readonly tokenFactory : AsyncTokenFactory;
  private messages : Messages;
  private bookItemOutput: HTMLDivElement;
  private scroller: Scroll;

  constructor(scroller: Scroll, bookItemOutput: HTMLDivElement, messages : Messages) {
    this.tokenFactory = new AsyncTokenFactory();
    this.scroller = scroller;
    this.bookItemOutput = bookItemOutput;
    this.messages = messages;
    this.openBookBlob = new Uint8Array(0);
    this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;
  }

  public isBookClosed() {
    return this.openBookItemRendered < 0 || this.openBook.items.length === 0;
  }

  public async renderOpenBookItem(): Promise<void>  {
    const item = this.openBook.items[this.openBookItemIndex];
    if (!item) return;
    this.bookItemOutput.replaceChildren();
    await item.render(this.bookItemOutput.id);
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
  }

  public async loadNewBook(bookBytes: Uint8Array, token : AsyncToken) {
    if (this.openBookItemRendered >= 0) {
      const previousItem = this.openBook.items[this.openBookItemRendered];
      if (previousItem) {
        previousItem.cleanup('#book-content');
      }
      this.openBookBlob = new Uint8Array(0);
      this.openBookItemRendered = -1;
      this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    }
    const book = await parseEpubBook(bookBytes);
    if (!token.isValid()) return;
    this.openBookBlob = bookBytes;
    this.openBook = book;
    this.openBookItemIndex = 0;
    await this.renderOpenBookItem();
    this.openBookItemRendered = 0;
  }
}
