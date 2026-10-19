import type { EpubBook } from "./epub.js";
import { Messages } from "./messages.js";

export class App {
  public openBookBlob : Uint8Array;
  public openBook : EpubBook;
  public openBookItemIndex : number;
  public openBookItemRendered : number;
  private messages : Messages;
  private bookItemOutput: HTMLDivElement;
  constructor(bookItemOutput: HTMLDivElement, messages : Messages) {
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

  public closeBook() {
    if (this.isBookClosed()) return;
    this.openBook.items[this.openBookItemRendered]?.cleanup(this.bookItemOutput.id);
    this.openBookBlob = new Uint8Array(0);
    this.openBook = { items: [], media: [], fonts: [], title: "", authors: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;
  }
}
