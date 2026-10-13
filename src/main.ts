import { loadBookFile } from "./book-loader.js";
import { createBulkSynonym, restoreIneligibleSynonyms } from "./bulk-synonym.js";
import { runBulkSynonym } from "./bulk-run.js";
import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { parseEpubBook, type EpubBook } from "./epub.js";
import { createKnownWordDictionary } from "./known-word-dictionary.js";
import { resolveLinkTarget } from "./hyperlink.js";
import { createLoadingModal } from "./loading-modal.js";
import { createNavMenu } from "./nav-menu.js";
import { popups, type Popup } from "./menu/popup.js";
import { createSynonymMenu } from "./menu/synonym-menu.js";
import { createUnknownMenu } from "./menu/unknown-menu.js";
import { createUserSettings } from "./settings.js";
import { createSettingsDialog } from "./settings-dialog.js";
import { BLOCK_SELECTOR, extractSentence } from "./sentence.js";
import { ensureStyles } from "./style.js";
import { createThesaurus } from "./thesaurus.js";
import { createUnknownWordDictionary } from "./unknown-word-dictionary.js";
import { bindPersistence } from "./word-dictionary.js";
import { applySynonym, restoreAllOccurrences, wrapWord } from "./word-span.js";

const CAMBRIDGE_BASE = "https://dictionary.cambridge.org/dictionary/english/";
const thesaurus = createThesaurus();

class App {
  public openBookBlob : Uint8Array;
  public openBook : EpubBook;
  public openBookItemIndex : number;
  public openBookItemRendered : number;
  constructor() {
    this.openBookBlob = new Uint8Array(0);
    this.openBook = { items: [], media: [], fonts: [] };
    this.openBookItemIndex = -1;
    this.openBookItemRendered = -1;
  }
}

export type ScrollTo =
  | { readonly kind: "anchor"; readonly anchor: string }
  | { readonly kind: "start" }
  | { readonly kind: "end" };

export const ToAnchor = (anchor: string): ScrollTo => ({ kind: "anchor", anchor });
export const ToStart = (): ScrollTo => ({ kind: "start" });
export const ToEnd = (): ScrollTo => ({ kind: "end" });

function hideAll(): void {
  for (const popup of popups) popup.hide();
}

export function initApp(bookItemOutput: HTMLDivElement, doc: Document = document): void {
  ensureStyles(doc);
  const app = new App();

  const known = createKnownWordDictionary();
  const unknown = createUnknownWordDictionary();
  bindPersistence(known, window, doc);
  bindPersistence(unknown, window, doc);
  const settings = createUserSettings();
  const bulk = createBulkSynonym({ thesaurus });

  let bulkRunning = false;
  const startBulkRun = (): void => {
    if (bulkRunning) {
      console.log("[bulk] already running, skipping");
      return;
    }
    bulkRunning = true;
    void runBulkSynonym({ bulk, known, unknown, settings, root: bookItemOutput }).finally(() => {
      bulkRunning = false;
    });
  };

  const applyMaximumTriggerWordFrequency = (next: number): void => {
    const previous = settings.maximumTriggerWordFrequency();
    if (next === previous) return;
    settings.setMaximumTriggerWordFrequency(next);
    if (next < previous) {
      const reverted = restoreIneligibleSynonyms(
        doc.body,
        { known, unknown },
        settings.maximumTriggerWordFrequency(),
      );
      console.log(
        `[settings] mtwf ${previous} -> ${next}, restored ${reverted.occurrences} occurrence(s) of ${reverted.words.length} word(s) (expected 0: a raised maximum never invalidates an earlier decision)`,
      );

    } else {
      console.log(`[settings] mtwf ${previous} -> ${next}, looking for newly eligible words`);
      startBulkRun();
    }
  };

  const settingsDialog = createSettingsDialog({
    settings,
    onApply: applyMaximumTriggerWordFrequency,
    doc,
  });

  const c2welcome = doc.getElementById("c2-welcome");

  const loadNewBookBtn = doc.getElementById("load-new-book");
  if (!loadNewBookBtn) return;

  let loadToken = 0;
  const cancelLoading = (): void => {
    loadToken++;
    loadingModal.hide();
  };
  const loadingModal = createLoadingModal({ doc, onCancel: cancelLoading });

  const unknownMenu = createUnknownMenu(doc);
  const synonymMenu = createSynonymMenu(doc);
  const navMenu = createNavMenu(doc);

  let clicked: ClickedWord = { word: "", node: null, start: 0, end: 0 };
  let synonymSpan: HTMLSpanElement | null = null;
  let clickedLink: { href: string; fromIndex: number } | null = null;

  const setFollowLinkVisible = (visible: boolean): void => {
    const display = visible ? "" : "none";
    unknownMenu.followLinkItem.style.display = display;
    synonymMenu.followLinkItem.style.display = display;
  };

  const followLink = (): void => {
    if (!clickedLink) return;
    const { href, fromIndex } = clickedLink;
    const target = resolveLinkTarget(app.openBook, fromIndex, href);
    if (target.kind === "external") {
      window.open(target.url, "_blank", "noopener");
    } else if (target.kind === "local") {
      const scroll = target.anchor ? ToAnchor(target.anchor) : ToStart();
      void goToBookItem(target.index, scroll).catch((error) =>
        console.error("failed to follow link", error),
      );
    } else {
      console.warn(`[link] cannot map "${target.path}" to a book item, ignoring`);
    }
    hideAll();
  };

  const isWindowAtBottom = (): boolean => {
    const el = doc.scrollingElement ?? doc.documentElement;
    return window.innerHeight + window.scrollY >= el.scrollHeight - 1;
  };

  const isWindowAtTop = (): boolean => window.scrollY <= 0;

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (loadingModal.isOpen()) {
        cancelLoading();
        return;
      }
      if (settingsDialog.isOpen()) {
        settingsDialog.hide();
        return;
      }
      hideAll();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (loadingModal.isOpen() || settingsDialog.isOpen()) return;
      event.preventDefault();
      navigateRelative(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if ((event.key === " " || event.key === "Spacebar") && event.shiftKey) {
      if (loadingModal.isOpen() || settingsDialog.isOpen()) return;
      if (isWindowAtTop()) {
        event.preventDefault();
        navigateRelative(-1);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      if (loadingModal.isOpen() || settingsDialog.isOpen()) return;
      if (isWindowAtTop()) {
        event.preventDefault();
        navigateRelative(-1);
      }
      return;
    }
    if (event.key === " " || event.key === "Spacebar" || event.key === "ArrowDown") {
      if (loadingModal.isOpen() || settingsDialog.isOpen()) return;
      if (!isWindowAtBottom()) return;
      event.preventDefault();
      navigateRelative(1);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() !== "c") return;
    if (loadingModal.isOpen() || settingsDialog.isOpen()) return;
    const target = app.openBook.navigationTarget;
    if (!target) return;
    const scroll = target.anchor ? ToAnchor(target.anchor) : ToStart();
    void goToBookItem(target.index, scroll).catch((error) =>
      console.error("navigation failed", error),
    );
  };

  const onDocClick = (event: MouseEvent): void => {
    const target = event.target as Node;
    for (const popup of popups) {
      if (popup.isOpen() && !popup.contains(target)) popup.hide();
    }
  };

  const renderOpenBookItem = async (): Promise<void> => {
    const item = app.openBook.items[app.openBookItemIndex];
    if (!item) return;
    bookItemOutput.replaceChildren();
    await item.render(bookItemOutput.id);
  };

  const updateNavMenu = (): void => {
    const hasBook = app.openBook.items.length > 0 && app.openBookItemIndex >= 0;
    navMenu.previousButton.disabled = !hasBook;
    navMenu.nextButton.disabled = !hasBook;
  };

  const scrollToAnchor = (anchor: string): void => {
    const byId = doc.getElementById(anchor);
    const target =
      byId && bookItemOutput.contains(byId)
        ? byId
        : Array.from(bookItemOutput.querySelectorAll<HTMLAnchorElement>("a[name]")).find(
            (a) => a.getAttribute("name") === anchor,
          );
    if (target) {
      target.scrollIntoView();
    } else {
      console.warn(`[link] anchor "#${anchor}" not found`);
      window.scrollTo(0, 0);
    }
  };

  const scrollToEnd = (): void => {
    const el = doc.scrollingElement ?? doc.documentElement;
    window.scrollTo(0, el.scrollHeight);
  };

  const applyScrollTo = (scroll: ScrollTo): void => {
    switch (scroll.kind) {
      case "anchor":
        scrollToAnchor(scroll.anchor);
        break;
      case "start":
        window.scrollTo(0, 0);
        break;
      case "end":
        scrollToEnd();
        break;
    }
  };

  const goToBookItem = async (index: number, scroll: ScrollTo = ToStart()): Promise<void> => {
    if (index < 0 || index >= app.openBook.items.length) return;
    if (index === app.openBookItemRendered) {
      applyScrollTo(scroll);
      return;
    }
    app.openBook.items[app.openBookItemRendered]?.cleanup(bookItemOutput.id);
    app.openBookItemIndex = index;
    await renderOpenBookItem();
    app.openBookItemRendered = index;
    updateNavMenu();
    applyScrollTo(scroll);
  };

  const navigateRelative = (delta: number): void => {
    const count = app.openBook.items.length;
    if (count === 0 || app.openBookItemIndex < 0) return;
    const index = (app.openBookItemIndex + delta + count) % count;
    void goToBookItem(index, delta < 0 ? ToEnd() : ToStart()).catch((error) =>
      console.error("navigation failed", error),
    );
  };

  navMenu.previousButton.addEventListener("click", () => {
    navigateRelative(-1);
  });

  navMenu.nextButton.addEventListener("click", () => {
    navigateRelative(1);
  });

  loadNewBookBtn.addEventListener("click", () => {
    void loadBookFile({ doc })
      .then(async (bytes) => {
        const token = ++loadToken;
        loadingModal.show();
        try {
          if (app.openBookItemRendered >= 0) {
            const previousItem = app.openBook.items[app.openBookItemRendered];
            if (previousItem) {
              previousItem.cleanup('#book-content');
            }
            app.openBookBlob = new Uint8Array(0);
            app.openBookItemRendered = -1;
            app.openBook = { items: [], media: [], fonts: [] };
          }
          const book = await parseEpubBook(bytes);
          if (token !== loadToken) return;
          app.openBookBlob = bytes;
          app.openBook = book;
          app.openBookItemIndex = 0;
          await renderOpenBookItem();
          app.openBookItemRendered = 0;
          updateNavMenu();
          if (c2welcome) c2welcome.style.display = "none";

        } finally {
          if (token === loadToken) loadingModal.hide();
        }
      })
      .catch((error) => {
        console.error("failed to open book", error);
      });
  });

  unknownMenu.unknownItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (unknownMenu.popup.isOpen()) {
      const { word, node } = clicked;
      console.log(word || null);
      if (node) {
        const span = wrapWord(clicked);
        if (span) {
          known.remove(word);
          unknown.add(word);
          const sentence = extractSentence(span);
          console.log(sentence);
          void thesaurus
            .findSynonym(word, sentence)
            .then((synonym) => {
              console.log(synonym);
              applySynonym(span, synonym);
            })
            .catch((error) => console.error(error));
        }
      }
    }
    unknownMenu.popup.hide();
  });

  const openSettings = (menu: Popup, event: MouseEvent): void => {
    event.stopPropagation();
    menu.hide();
    settingsDialog.show();
  };

  unknownMenu.settingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(unknownMenu.popup, event);
  });

  synonymMenu.settingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(synonymMenu.popup, event);
  });

  unknownMenu.followLinkItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    followLink();
  });

  synonymMenu.followLinkItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    followLink();
  });

  unknownMenu.hideItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    unknownMenu.popup.hide();
  });

  synonymMenu.dictionaryItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.popup.isOpen() && synonymSpan) {
      const word = synonymSpan.dataset.originWord ?? synonymSpan.textContent ?? "";
      window.open(`${CAMBRIDGE_BASE}${encodeURIComponent(word)}`, "_blank", "noopener");
    }
    synonymMenu.popup.hide();
  });

  synonymMenu.rememberedItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.popup.isOpen() && synonymSpan) {
      const word = synonymSpan.dataset.originWord ?? synonymSpan.textContent ?? "";
      const restored = restoreAllOccurrences(word, bookItemOutput);
      unknown.remove(word);
      known.add(word);
      console.log(`[known] "${word}" restored ${restored} occurrence(s)`);
    }
    synonymMenu.popup.hide();
  });

  let advancing = false;
  const onWheel = (event: WheelEvent): void => {
    if (advancing || event.deltaY === 0) return;
    if (loadingModal.isOpen() || settingsDialog.isOpen()) return;
    const next = event.deltaY > 0;
    if (next ? !isWindowAtBottom() : !isWindowAtTop()) return;
    advancing = true;
    navigateRelative(next ? 1 : -1);
    window.setTimeout(() => {
      advancing = false;
    }, 300);
  };

  doc.addEventListener("click", onDocClick);
  doc.addEventListener("keydown", onKeydown);
  doc.addEventListener("wheel", onWheel, { passive: true });

  doc.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0) return;
    const target = event.target;
    hideAll();
    if (!(target instanceof Element)) { return; }
    if (!target.closest("#book-content")) { return; }

    const anchor = target.closest("a[href]");
    const rawHref = anchor?.getAttribute("href") ?? null;
    clickedLink = rawHref ? { href: rawHref, fromIndex: app.openBookItemRendered } : null;
    setFollowLinkVisible(clickedLink !== null);

    const synonym = target.closest(".synonym");
    if (synonym instanceof HTMLSpanElement) {
      event.preventDefault();
      synonymSpan = synonym;
      synonymMenu.label.textContent = synonym.dataset.originWord ?? synonym.textContent ?? "";
      synonymMenu.popup.show(mouseEvent.clientX, mouseEvent.clientY);
      return;
    }

    const block = target.closest(BLOCK_SELECTOR);
    if (!(block instanceof HTMLElement)) return;
    clicked = extractClickedWord(block);
    event.preventDefault();
    unknownMenu.popup.show(mouseEvent.clientX, mouseEvent.clientY);
  });

  if (doc.readyState === "complete") {
    startBulkRun();
  } else {
    window.addEventListener("load", startBulkRun, { once: true });
  }
}
