import { App } from "./app";
import { AsyncTokenFactory, type AsyncToken } from "./async-token";
import { createBulkSynonym, restoreIneligibleSynonyms } from "./bulk-synonym";
import { runBulkSynonym } from "./bulk-run";
import { extractClickedWord, type ClickedWord } from "./clicked-word";
import { handleKeydown } from "./event/keydown";
import { bindMouseDoc } from "./event/mouse";
import { bindMenus } from "./event/menu";
import { createHelpDialog } from "./help-dialog";
import { createConfirmDialog } from "./confirm-dialog";
import { initDb } from "./db/index";
import { createKnownWordDictionary } from "./known-word-dictionary";
import { resolveLinkTarget } from "./hyperlink";
import { createBookLibrary } from "./library/db";
import { createBookLibraryView } from "./library/view";
import { createLoadingModal } from "./loading-modal";
import { createMessages, Info, Warning } from "./messages";
import { createNavMenu } from "./menu/nav/nav-menu";
import { popups, hideAll } from "./menu/popup";
import { createSynonymMenu } from "./menu/synonym-menu";
import { createUnknownMenu } from "./menu/unknown-menu";
import { createUserSettings } from "./settings";
import { createSettingsDialog } from "./settings-dialog";
import { Scroll, ToAnchor, ToEnd, ToStart, type ScrollTo } from "./scroll-to";
import { BLOCK_SELECTOR } from "./sentence";
import { createThesaurus } from "./thesaurus";
import { createUnknownWordDictionary } from "./unknown-word-dictionary";
import { bindPersistence } from "./word-dictionary";

const thesaurus = createThesaurus();
const library = createBookLibrary(initDb("click-library"));


const getDiv = (id : string): HTMLElement => {
  const d = document.getElementById(id);
  if (d) return d;
  throw new ReferenceError(`Tag with id ${id} is not found`);

}
export function initApp(bookItemOutput: HTMLDivElement, doc: Document = document): void {
  const messages = createMessages(doc);
  const scroller = new Scroll(doc);
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
  const confirmDialog = createConfirmDialog({ doc, confirmLabel: "Remove" });
  const app = new App(
    doc,
    window,
    tokenFactory,
    loadingModal,
    c2welcome,
    scroller,
    bookItemOutput,
    messages,
    settingsDialog,
    helpDialog,
    confirmDialog,
    known,
    unknown,
    thesaurus,
    library,
  );
  app.navMenu = createNavMenu(doc, {
    onPrevious: () => app.navigateRelative(-1),
    onNext: () => app.navigateRelative(1),
    onClose: () => app.closeBook(),
    onContent: () => app.showTableOfContents(),
    onToChapterStart: () => app.scrollTo(ToStart()),
    onToChapterEnd: () => app.scrollTo(ToEnd()),
  });

  const loadNewBookBtn = getDiv("load-new-book");
  const showHelpBtn = getDiv("show-help");
  const unknownMenu = createUnknownMenu(doc);
  const synonymMenu = createSynonymMenu(doc);

  const libraryView = createBookLibraryView({
    target: getDiv("library"),
    library,
    onOpenBook: (contentSha) => app.openBookFromLibrary(contentSha),
    onOpenNewBook: () => app.loadNewBookDialog(),
    doc,
  });
  app.onLibraryChanged = () => void libraryView.refresh();

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
