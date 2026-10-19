import { App } from "./app.js";
import { AsyncTokenFactory, type AsyncToken } from "./async-token.js";
import { createBulkSynonym, restoreIneligibleSynonyms } from "./bulk-synonym.js";
import { runBulkSynonym } from "./bulk-run.js";
import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { handleKeydown } from "./event/keydown.js";
import { createKnownWordDictionary } from "./known-word-dictionary.js";
import { resolveLinkTarget } from "./hyperlink.js";
import { createLoadingModal } from "./loading-modal.js";
import { createMessages, Info, Warning } from "./messages.js";
import { createNavMenu } from "./nav-menu.js";
import { popups, type Popup } from "./menu/popup.js";
import { createSynonymMenu } from "./menu/synonym-menu.js";
import { createUnknownMenu } from "./menu/unknown-menu.js";
import { createUserSettings } from "./settings.js";
import { createSettingsDialog } from "./settings-dialog.js";
import { Scroll, ToAnchor, ToStart, type ScrollTo } from "./scroll-to.js";
import { BLOCK_SELECTOR, extractSentence } from "./sentence.js";
import { ensureStyles } from "./style.js";
import { createThesaurus } from "./thesaurus.js";
import { createUnknownWordDictionary } from "./unknown-word-dictionary.js";
import { bindPersistence } from "./word-dictionary.js";
import { applySynonym, restoreAllOccurrences, wrapWord } from "./word-span.js";

const CAMBRIDGE_BASE = "https://dictionary.cambridge.org/dictionary/english/";
const thesaurus = createThesaurus();

function hideAll(): void {
  for (const popup of popups) popup.hide();
}

const getDiv = (id : string): HTMLElement => {
  const d = document.getElementById(id);
  if (d) return d;
  throw new ReferenceError(`Tag with id ${id} is not found`);

}
export function initApp(bookItemOutput: HTMLDivElement, doc: Document = document): void {
  ensureStyles(doc);
  const messages = createMessages(doc);
  const scroller = new Scroll(doc);
  const navMenu = createNavMenu(doc);
  const c2welcome = getDiv("c2-welcome");
  const loadingModal = createLoadingModal({ doc, onCancel: () => tokenFactory.issue() });
  const tokenFactory = new AsyncTokenFactory();
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
  const app = new App(
    doc,
    tokenFactory,
    loadingModal,
    c2welcome,
    navMenu,
    scroller,
    bookItemOutput,
    messages,
    settingsDialog,
  );
  const loadNewBookBtn = getDiv("load-new-book");
  const unknownMenu = createUnknownMenu(doc);
  const synonymMenu = createSynonymMenu(doc);


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

  const onDocClick = (event: MouseEvent): void => {
    const target = event.target as Node;
    for (const popup of popups) {
      if (popup.isOpen() && !popup.contains(target)) popup.hide();
    }
  };

  const goToBookItem = async (index: number, scroll: ScrollTo = ToStart()): Promise<void> => {
    await app.goToBookItem(index, scroll);
  };

  navMenu.previousButton.addEventListener("click", () => app.navigateRelative(-1));
  navMenu.nextButton.addEventListener("click", () => app.navigateRelative(1));
  loadNewBookBtn.addEventListener("click", () => app.loadNewBookDialog());

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
    if (next ? !scroller.isWindowAtBottom() : !scroller.isWindowAtTop()) return;
    advancing = true;
    app.navigateRelative(next ? 1 : -1);
    window.setTimeout(() => {
      advancing = false;
    }, 300);
  };

  doc.addEventListener("click", onDocClick);
  doc.addEventListener("keydown", (event) => handleKeydown(event, app, hideAll));
  doc.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("scroll", () => messages.clear(), { passive: true });

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
