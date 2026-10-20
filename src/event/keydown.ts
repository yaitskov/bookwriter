import type { App } from "../app.js";
import { ToAnchor, ToStart } from "../scroll-to.js";
import { hideAll } from "../menu/popup.js";

export function handleKeydown(event: KeyboardEvent, app: App): void {
  const isModalOpen = (): boolean =>
    app.loadingModal.isOpen() ||
    app.settingsDialog.isOpen() ||
    app.helpDialog.isOpen() ||
    app.confirmDialog.isOpen();

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
  if (key === "q") {
    if (isModalOpen()) return;
    app.closeBook();
    return;
  }
  if (key === "o") {
    if (event.repeat) return;
    if (isModalOpen()) return;
    app.loadNewBookDialog();
    return;
  }
  if (key === "h" || key === "k") {
    if (event.repeat) return;
    if (isModalOpen()) return;
    app.helpDialog.show();
    return;
  }
  if (key === "s") {
    if (event.repeat) return;
    if (isModalOpen()) return;
    app.settingsDialog.show();
    return;
  }
  if (key === "r") {
    if (event.repeat) return;
    if (isModalOpen()) return;
    void app.removeOpenBookFromLibrary();
    return;
  }
  if (key !== "c") return;
  if (isModalOpen()) return;
  const target = app.openBook.navigationTarget;
  if (!target) return;
  const scroll = target.anchor ? ToAnchor(target.anchor) : ToStart();
  void app.goToBookItem(target.index, scroll).catch((error) =>
    console.error("navigation failed", error),
  );
}
