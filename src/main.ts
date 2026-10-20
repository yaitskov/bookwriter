import { App } from "./app.js";
import { AsyncTokenFactory, type AsyncToken } from "./async-token.js";
import { createBulkSynonym, restoreIneligibleSynonyms } from "./bulk-synonym.js";
import { runBulkSynonym } from "./bulk-run.js";
import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { handleKeydown } from "./event/keydown.js";
import { bindMouseDoc } from "./event/mouse.js";
import { bindMenus } from "./event/menu.js";
import { createHelpDialog } from "./help-dialog.js";
import { initDb } from "./db/index.js";
import { createKnownWordDictionary } from "./known-word-dictionary.js";
import { resolveLinkTarget } from "./hyperlink.js";
import { createBookLibrary } from "./library/db.js";
import { createLoadingModal } from "./loading-modal.js";
import { createMessages, Info, Warning } from "./messages.js";
import { createNavMenu } from "./nav-menu.js";
import { popups, hideAll } from "./menu/popup.js";
import { createSynonymMenu } from "./menu/synonym-menu.js";
import { createUnknownMenu } from "./menu/unknown-menu.js";
import { createUserSettings } from "./settings.js";
import { createSettingsDialog } from "./settings-dialog.js";
import { Scroll, ToAnchor, ToStart, type ScrollTo } from "./scroll-to.js";
import { BLOCK_SELECTOR } from "./sentence.js";
import { ensureStyles } from "./style.js";
import { createThesaurus } from "./thesaurus.js";
import { createUnknownWordDictionary } from "./unknown-word-dictionary.js";
import { bindPersistence } from "./word-dictionary.js";

const thesaurus = createThesaurus();
const library = createBookLibrary(initDb("click-library"));


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
  const helpDialog = createHelpDialog({ doc });
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
    helpDialog,
    known,
    unknown,
    thesaurus,
    library,
  );
  const loadNewBookBtn = getDiv("load-new-book");
  const showHelpBtn = getDiv("show-help");
  const unknownMenu = createUnknownMenu(doc);
  const synonymMenu = createSynonymMenu(doc);

  navMenu.previousButton.addEventListener("click", () => app.navigateRelative(-1));
  navMenu.nextButton.addEventListener("click", () => app.navigateRelative(1));
  loadNewBookBtn.addEventListener("click", () => app.loadNewBookDialog());
  showHelpBtn.addEventListener("click", () => app.helpDialog.show());

  bindMenus(unknownMenu, synonymMenu, app);

  doc.addEventListener("keydown", (event) => handleKeydown(event, app));
  bindMouseDoc(doc, window, app, messages,  unknownMenu, synonymMenu);

  if (doc.readyState === "complete") {
    startBulkRun();
  } else {
    window.addEventListener("load", startBulkRun, { once: true });
  }
}
