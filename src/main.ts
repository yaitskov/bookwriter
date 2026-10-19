import { App } from "./app.js";
import { AsyncTokenFactory, type AsyncToken } from "./async-token.js";
import { createBulkSynonym, restoreIneligibleSynonyms } from "./bulk-synonym.js";
import { runBulkSynonym } from "./bulk-run.js";
import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { handleKeydown } from "./event/keydown.js";
import { bindMouseDoc } from "./event/mouse.js";
import { bindMenus } from "./event/menu.js";
import { createKnownWordDictionary } from "./known-word-dictionary.js";
import { resolveLinkTarget } from "./hyperlink.js";
import { createLoadingModal } from "./loading-modal.js";
import { createMessages, Info, Warning } from "./messages.js";
import { createNavMenu } from "./nav-menu.js";
import { popups, hideAll } from "./menu/popup.js";
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
    window,
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

  navMenu.previousButton.addEventListener("click", () => app.navigateRelative(-1));
  navMenu.nextButton.addEventListener("click", () => app.navigateRelative(1));
  loadNewBookBtn.addEventListener("click", () => app.loadNewBookDialog());

  const onUnknownWord = (): void => {
    const { word, node } = app.clicked;
    console.log(word || null);
    if (!node) return;
    const span = wrapWord(app.clicked);
    if (!span) return;
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
  };

  const onDictionary = (): void => {
    if (!app.synonymSpan) return;
    const word = app.synonymSpan.dataset.originWord ?? app.synonymSpan.textContent ?? "";
    window.open(`${CAMBRIDGE_BASE}${encodeURIComponent(word)}`, "_blank", "noopener");
  };

  const onRemembered = (): void => {
    if (!app.synonymSpan) return;
    const word = app.synonymSpan.dataset.originWord ?? app.synonymSpan.textContent ?? "";
    const restored = restoreAllOccurrences(word, bookItemOutput);
    unknown.remove(word);
    known.add(word);
    console.log(`[known] "${word}" restored ${restored} occurrence(s)`);
  };

  bindMenus(
    unknownMenu,
    synonymMenu,
    settingsDialog,
    onUnknownWord,
    () => app.followLink(),
    onDictionary,
    onRemembered,
  );

  doc.addEventListener("keydown", (event) => handleKeydown(event, app));
  bindMouseDoc(doc, window, app, messages,  unknownMenu, synonymMenu);

  if (doc.readyState === "complete") {
    startBulkRun();
  } else {
    window.addEventListener("load", startBulkRun, { once: true });
  }
}
