import type { EpubBook } from "./epub.js";
import { Messages } from "./messages.js";
import { Scroll, ToAnchor, ToEnd, ToStart, type ScrollTo } from "./scroll-to.js";

export class App {
  public openBookBlob : Uint8Array;
  public openBook : EpubBook;
  public openBookItemIndex : number;
  public openBookItemRendered : number;
  private messages : Messages;
  private bookItemOutput: HTMLDivElement;
  private scroller: Scroll;

  constructor(scroller: Scroll, bookItemOutput: HTMLDivElement, messages : Messages) {
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
    if (this.isBookClosed()) return;
    this.openBook.items[this.openBookItemRendered]?.cleanup(this.bookItemOutput.id);
    this.openBookBlob = new Uint8Array(0);
    this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;
  }
}
