import type { App } from "../app";
import { ToAnchor, ToStart } from "../scroll-to";
import { hideAll, isAnyPopupOpen } from "../menu/popup";

export function handleKeydown(event: KeyboardEvent, app: App): void {
  const isModalOpen = (): boolean =>
    app.loadingModal.isOpen() ||
    app.settingsDialog.isOpen() ||
    app.helpDialog.isOpen() ||
    app.confirmDialog.isOpen() ||
    isAnyPopupOpen();

  if (event.key === "Escape") {
    app.messages.clear();
    if (app.confirmDialog.isOpen()) {
      app.confirmDialog.hide();
      return;
    }
    if (app.loadingModal.isOpen()) {
      app.loadingModal.cancelLoading();
      return;
    }
    if (app.settingsDialog.isOpen()) {
      app.settingsDialog.hide();
      return;
    }
    if (app.helpDialog.isOpen()) {
      app.helpDialog.hide();
      return;
    }
    hideAll();
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    if (isModalOpen()) return;
    event.preventDefault();
    app.navigateRelative(event.key === "ArrowLeft" ? -1 : 1);
    return;
  }
  if ((event.key === " " || event.key === "Spacebar") && event.shiftKey) {
    if (isModalOpen()) return;
    if (app.scroller.isWindowAtTop()) {
      event.preventDefault();
      app.navigateRelative(-1);
    }
    return;
  }
  if (event.key === "ArrowUp") {
    if (isModalOpen()) return;
    if (app.scroller.isWindowAtTop()) {
      event.preventDefault();
      app.navigateRelative(-1);
    }
    return;
  }
  if (event.key === " " || event.key === "Spacebar" || event.key === "ArrowDown") {
    if (isModalOpen()) return;
    if (!app.scroller.isWindowAtBottom()) return;
    event.preventDefault();
    app.navigateRelative(1);
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (event.repeat || isModalOpen()) return;
  if (key === "q") {
    app.closeBook();
  } else if (key === "o") {
    app.loadNewBookDialog();
  } else if  (key === "h" || key === "k") {
    app.helpDialog.show();
  } else if (key === "s") {
    app.settingsDialog.show();
  } else if (key === "r") {
    void app.removeOpenBookFromLibrary();
  } else if (key === "c") {
    app.showTableOfContents();
  } else {
    console.error(`no handle for key: ${key}`);
  }
}
