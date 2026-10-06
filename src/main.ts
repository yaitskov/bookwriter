import { loadBookFile } from "./book-loader.js";
import { createBulkSynonym, restoreIneligibleSynonyms } from "./bulk-synonym.js";
import { runBulkSynonym } from "./bulk-run.js";
import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { createEpubItems, type EpubItem } from "./epub.js";
import { createKnownWordDictionary } from "./known-word-dictionary.js";
import { createLoadingModal } from "./loading-modal.js";
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
  public openBookItems : EpubItem[];
  public openBookItemIndex : number;
  constructor() {
    this.openBookBlob = new Uint8Array(0);
    this.openBookItems = [];
    this.openBookItemIndex = 0;
  }
}

function hideAll(): void {
  for (const popup of popups) popup.hide();
}

export function initApp(bookContent: HTMLDivElement, doc: Document = document): void {
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
    void runBulkSynonym({ bulk, known, unknown, settings, root: bookContent }).finally(() => {
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

  let clicked: ClickedWord = { word: "", node: null, start: 0, end: 0 };
  let synonymSpan: HTMLSpanElement | null = null;

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    if (loadingModal.isOpen()) {
      cancelLoading();
      return;
    }
    if (settingsDialog.isOpen()) {
      settingsDialog.hide();
      return;
    }
    hideAll();
  };

  const onDocClick = (event: MouseEvent): void => {
    const target = event.target as Node;
    for (const popup of popups) {
      if (popup.isOpen() && !popup.contains(target)) popup.hide();
    }
  };

  const renderOpenBookItem = async (): Promise<void> => {
    const item = app.openBookItems[app.openBookItemIndex];
    if (!item) return;
    bookContent.replaceChildren();
    await item.render(bookContent.id);
  };

  loadNewBookBtn.addEventListener("click", () => {
    void loadBookFile({ doc })
      .then(async (bytes) => {
        const token = ++loadToken;
        loadingModal.show();
        try {
          const items = await createEpubItems(bytes);
          if (token !== loadToken) return;
          app.openBookBlob = bytes;
          app.openBookItems = items;
          app.openBookItemIndex = 0;
          await renderOpenBookItem();
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
      const restored = restoreAllOccurrences(word, bookContent);
      unknown.remove(word);
      known.add(word);
      console.log(`[known] "${word}" restored ${restored} occurrence(s)`);
    }
    synonymMenu.popup.hide();
  });

  doc.addEventListener("click", onDocClick);
  doc.addEventListener("keydown", onKeydown);

  doc.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0) return;
    const target = event.target;
    hideAll();
    if (!(target instanceof Element)) { return; }
    if (!target.closest("#book-content")) { return; }

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
