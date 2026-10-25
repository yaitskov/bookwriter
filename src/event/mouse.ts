import { extractClickedWord, type ClickedWord } from "../clicked-word";
import { App } from "../app";
import { type Messages } from "../messages";
import { hideAll, isAnyPopupOpen } from "../menu/popup";
import { type SettingsDialog } from "../settings/settings-dialog";
import { type SynonymMenu } from "../menu/synonym-menu";
import { type UnknownMenu } from "../menu/unknown-menu";
import { BLOCK_SELECTOR } from "../sentence";

interface SelectionSnapshot {
  readonly collapsed: boolean;
  readonly text: string;
}

const captureSelection = (doc: Document): SelectionSnapshot => {
  const selection = doc.getSelection();
  return {
    collapsed: selection?.isCollapsed ?? true,
    text: selection?.toString() ?? "",
  };
};

const selectionChangedSince = (doc: Document, before: SelectionSnapshot): boolean => {
  const current = captureSelection(doc);
  return !current.collapsed &&
    current.text.length > 0 &&
    (before.collapsed || current.text !== before.text);
};

export function bindMouseDoc(doc: Document, win: Window, app: App, messages: Messages,
                             unknownMenu: UnknownMenu, synonymMenu: SynonymMenu): void
{
  let selectionAtMouseDown: SelectionSnapshot | null = null;
  doc.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    selectionAtMouseDown = captureSelection(doc);
  });

  const setFollowLinkVisible = (visible: boolean): void => {
    const display = visible ? "" : "none";
    unknownMenu.followLinkItem.style.display = display;
    synonymMenu.followLinkItem.style.display = display;
  };

  const GESTURE_END_MS = 300;
  let gestureActive = false;
  let gestureStartedAtEdge = false;
  let navigatedThisGesture = false;
  let gestureEndTimer: number | null = null;

  const endGesture = (): void => {
    gestureActive = false;
    gestureStartedAtEdge = false;
    navigatedThisGesture = false;
    gestureEndTimer = null;
  };

  const keepGestureAlive = (): void => {
    if (gestureEndTimer !== null) win.clearTimeout(gestureEndTimer);
    gestureEndTimer = win.setTimeout(endGesture, GESTURE_END_MS);
  };

  const beginGesture = (next: boolean): void => {
    gestureActive = true;
    gestureStartedAtEdge = next
      ? app.scroller.isWindowAtBottom()
      : app.scroller.isWindowAtTop();
    navigatedThisGesture = false;
  };

  const onWheel = (event: WheelEvent): void => {
    if (isAnyPopupOpen()) {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.deltaY === 0) return;

    const next = event.deltaY > 0;
    if (!gestureActive) beginGesture(next);
    keepGestureAlive();
    if (!gestureStartedAtEdge || navigatedThisGesture) return;
    if (next ? !app.scroller.isWindowAtBottom() : !app.scroller.isWindowAtTop()) return;
    navigatedThisGesture = true;
    app.navigateRelative(next ? 1 : -1);
  };

  doc.addEventListener("wheel", onWheel, { passive: false });
  win.addEventListener("scroll", () => messages.clear(), { passive: true });

  doc.addEventListener("dblclick", (event: Event) => {
    const target = event.target;
    hideAll();
    if (!(target instanceof Element)) { return; }
    if (!target.closest("#book-content")) { return; }

    const anchor = target.closest("a[href]");
    const rawHref = anchor?.getAttribute("href") ?? null;
    app.clickedLink = rawHref ? { href: rawHref, fromIndex: app.openBookItemRendered } : null;

    if (app.clickedLink) {
      event.preventDefault();
      app.followLink();
    }

  });
  doc.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0) return;
    const target = event.target;
    const wasPopupOpen = isAnyPopupOpen();
    const selectedSinceMouseDown = selectionAtMouseDown !== null &&
      selectionChangedSince(doc, selectionAtMouseDown);
    selectionAtMouseDown = null;
    hideAll();
    if (wasPopupOpen) return;
    if (!(target instanceof Element)) { return; }
    if (!target.closest("#book-content")) { return; }

    const anchor = target.closest("a[href]");
    const rawHref = anchor?.getAttribute("href") ?? null;
    app.clickedLink = rawHref ? { href: rawHref, fromIndex: app.openBookItemRendered } : null;

    if (app.clickedLink && (mouseEvent.ctrlKey || mouseEvent.metaKey)) {
      event.preventDefault();
      app.followLink();
      return;
    }

    if (selectedSinceMouseDown) return;

    setFollowLinkVisible(app.clickedLink !== null);

    const synonym = target.closest(".synonym");
    if (synonym instanceof HTMLSpanElement) {
      event.preventDefault();
      app.synonymSpan = synonym;
      synonymMenu.label.textContent = synonym.dataset.originWord ?? synonym.textContent ?? "";
      synonymMenu.popup.show(mouseEvent.clientX, mouseEvent.clientY);
      return;
    }

    const block = target.closest(BLOCK_SELECTOR);
    if (!(block instanceof HTMLElement)) return;
    app.clicked = extractClickedWord(block);
    event.preventDefault();
    unknownMenu.popup.show(mouseEvent.clientX, mouseEvent.clientY);
  });
}
