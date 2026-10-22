import { extractClickedWord, type ClickedWord } from "../clicked-word";
import { App } from "../app";
import { type Messages } from "../messages";
import { popups, hideAll } from "../menu/popup";
import { type SettingsDialog } from "../settings-dialog";
import { type SynonymMenu } from "../menu/synonym-menu";
import { type UnknownMenu } from "../menu/unknown-menu";
import { BLOCK_SELECTOR } from "../sentence";


const onDocClick = (event: MouseEvent): void => {
  const target = event.target as Node;
  for (const popup of popups) {
    if (popup.isOpen() && !popup.contains(target)) popup.hide();
  }
};


export function bindMouseDoc(doc: Document, win: Window, app: App, messages: Messages,
                             unknownMenu: UnknownMenu, synonymMenu: SynonymMenu): void
{
  const setFollowLinkVisible = (visible: boolean): void => {
    const display = visible ? "" : "none";
    unknownMenu.followLinkItem.style.display = display;
    synonymMenu.followLinkItem.style.display = display;
  };

  let advancing = false;
  const onWheel = (event: WheelEvent): void => {
    if (advancing || event.deltaY === 0) return;
    if (app.loadingModal.isOpen() || app.settingsDialog.isOpen() || app.helpDialog.isOpen() || app.confirmDialog.isOpen())
      return;
    const next = event.deltaY > 0;
    if (next ? !app.scroller.isWindowAtBottom() : !app.scroller.isWindowAtTop()) return;
    advancing = true;
    app.navigateRelative(next ? 1 : -1);
    win.setTimeout(() => {
      advancing = false;
    }, 300);
  };

  doc.addEventListener("click", onDocClick);
  doc.addEventListener("wheel", onWheel, { passive: true });
  win.addEventListener("scroll", () => messages.clear(), { passive: true });

  doc.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0) return;
    const target = event.target;
    hideAll();
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
