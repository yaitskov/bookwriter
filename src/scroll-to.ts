export type ScrollTo =
  | { readonly kind: "anchor"; readonly anchor: string }
  | { readonly kind: "start" }
  | { readonly kind: "end" };

export const ToAnchor = (anchor: string): ScrollTo => ({ kind: "anchor", anchor });
export const ToStart = (): ScrollTo => ({ kind: "start" });
export const ToEnd = (): ScrollTo => ({ kind: "end" });

export class Scroll {
  private readonly window: Window;
  private readonly document: Document;

  constructor(doc: Document = document, win: Window = window) {
    this.document = doc;
    this.window = win;
  }

  public isWindowAtTop(): boolean {
    return this.window.scrollY <= 0;
  }

  public isWindowAtBottom(): boolean {
    const el = this.document.scrollingElement ?? this.document.documentElement;
    return this.window.innerHeight + this.window.scrollY >= el.scrollHeight - 1;
  }

  public apply(scroll: ScrollTo): void {
    switch (scroll.kind) {
      case "anchor":
        this.toAnchor(scroll.anchor);
        break;
      case "start":
        this.window.scrollTo(0, 0);
        break;
      case "end":
        this.toEnd();
        break;
    }
  }

  private toAnchor(anchor: string): void {
    const target = this.document.getElementById(anchor);
    if (target) {
      target.scrollIntoView();
    } else {
      console.warn(`[link] anchor "#${anchor}" not found`);
    }
  }

  private toEnd(): void {
    const el = this.document.scrollingElement ?? this.document.documentElement;
    this.window.scrollTo(0, el.scrollHeight);
  }
}
