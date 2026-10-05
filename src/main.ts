import { createBulkSynonym, restoreIneligibleSynonyms } from "./bulk-synonym.js";
import { runBulkSynonym } from "./bulk-run.js";
import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { createKnownWordDictionary } from "./known-word-dictionary.js";
import { createUserSettings } from "./settings.js";
import { createSettingsDialog } from "./settings-dialog.js";
import { extractSentence } from "./sentence.js";
import { ensureStyles } from "./style.js";
import { createThesaurus } from "./thesaurus.js";
import { createUnknownWordDictionary } from "./unknown-word-dictionary.js";
import { bindPersistence } from "./word-dictionary.js";
import { applySynonym, restoreAllOccurrences, wrapWord } from "./word-span.js";

const MARGIN = 4;
const CAMBRIDGE_BASE = "https://dictionary.cambridge.org/dictionary/english/";
const thesaurus = createThesaurus();

interface Popup {
  element: HTMLDivElement;
  show(x: number, y: number): void;
  hide(): void;
  isOpen(): boolean;
  contains(target: Node): boolean;
}

const popups: Popup[] = [];

function createPopup(doc: Document, id: string): Popup {
  const element = doc.createElement("div");
  element.id = id;
  element.className = "word-menu";
  let open = false;

  const show = (x: number, y: number): void => {
    element.style.visibility = "hidden";
    element.style.display = "block";
    const { width, height } = element.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - width - MARGIN);
    const top = Math.min(y, window.innerHeight - height - MARGIN);
    element.style.left = `${Math.max(MARGIN, left)}px`;
    element.style.top = `${Math.max(MARGIN, top)}px`;
    element.style.visibility = "visible";
    open = true;
  };

  const hide = (): void => {
    element.style.display = "none";
    open = false;
  };

  doc.body.appendChild(element);
  const popup: Popup = {
    element,
    show,
    hide,
    isOpen: () => open,
    contains: (target) => element.contains(target),
  };
  popups.push(popup);
  return popup;
}

function hideAll(): void {
  for (const popup of popups) popup.hide();
}

export function initApp(bookContent: HTMLDivElement, doc: Document = document): void {
  ensureStyles(doc);

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

  const unknownMenu = createPopup(doc, "unknown-word-menu");
  const unknownItem = doc.createElement("button");
  unknownItem.type = "button";
  unknownItem.textContent = "Unknown word";
  const unknownSettingsItem = doc.createElement("button");
  unknownSettingsItem.type = "button";
  unknownSettingsItem.textContent = "Settings…";
  const hideItem = doc.createElement("button");
  hideItem.type = "button";
  hideItem.textContent = "Hide (Esc)";
  unknownMenu.element.append(unknownItem, unknownSettingsItem, hideItem);

  const synonymMenu = createPopup(doc, "synonym-menu");
  const synonymLabel = doc.createElement("div");
  synonymLabel.className = "menu-label";
  const dictionaryItem = doc.createElement("button");
  dictionaryItem.type = "button";
  dictionaryItem.textContent = "Open Cambridge Dictionary";
  const rememberedItem = doc.createElement("button");
  rememberedItem.type = "button";
  rememberedItem.textContent = "I remembered";
  const synonymSettingsItem = doc.createElement("button");
  synonymSettingsItem.type = "button";
  synonymSettingsItem.textContent = "Settings…";
  synonymMenu.element.append(
    synonymLabel,
    dictionaryItem,
    rememberedItem,
    synonymSettingsItem,
  );

  let clicked: ClickedWord = { word: "", node: null, start: 0, end: 0 };
  let synonymSpan: HTMLSpanElement | null = null;

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
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

  unknownItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (unknownMenu.isOpen()) {
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
    unknownMenu.hide();
  });

  const openSettings = (menu: Popup, event: MouseEvent): void => {
    event.stopPropagation();
    menu.hide();
    settingsDialog.show();
  };

  unknownSettingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(unknownMenu, event);
  });

  synonymSettingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(synonymMenu, event);
  });

  hideItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    unknownMenu.hide();
  });

  dictionaryItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.isOpen() && synonymSpan) {
      const word = synonymSpan.dataset.originWord ?? synonymSpan.textContent ?? "";
      window.open(`${CAMBRIDGE_BASE}${encodeURIComponent(word)}`, "_blank", "noopener");
    }
    synonymMenu.hide();
  });

  rememberedItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.isOpen() && synonymSpan) {
      const word = synonymSpan.dataset.originWord ?? synonymSpan.textContent ?? "";
      const restored = restoreAllOccurrences(word, doc.body);
      unknown.remove(word);
      known.add(word);
      console.log(`[known] "${word}" restored ${restored} occurrence(s)`);
    }
    synonymMenu.hide();
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
      synonymLabel.textContent = synonym.dataset.originWord ?? synonym.textContent ?? "";
      synonymMenu.show(mouseEvent.clientX, mouseEvent.clientY);
      return;
    }

    if (!(target instanceof HTMLParagraphElement)) return;
    clicked = extractClickedWord(target);
    event.preventDefault();
    unknownMenu.show(mouseEvent.clientX, mouseEvent.clientY);
  });

  if (doc.readyState === "complete") {
    startBulkRun();
  } else {
    window.addEventListener("load", startBulkRun, { once: true });
  }
}
