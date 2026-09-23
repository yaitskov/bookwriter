import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { extractSentence } from "./sentence.js";
import { ensureStyles } from "./style.js";
import { createThesaurus } from "./thesaurus.js";

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

function createPopup(id: string): Popup {
  const element = document.createElement("div");
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

  document.body.appendChild(element);
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

function wrapWord({ node, start, end, word }: ClickedWord): HTMLSpanElement | null {
  if (!node || !node.parentNode) return null;
  node.splitText(end);
  const middle = node.splitText(start);
  const span = document.createElement("span");
  span.className = "unknown-word";
  span.dataset.originWord = word;
  span.textContent = word;
  node.parentNode.replaceChild(span, middle);
  return span;
}

function applySynonym(span: HTMLSpanElement, synonym: string): void {
  span.textContent = synonym;
  span.classList.remove("unknown-word");
  span.classList.add("synonym");
}

export function setupParagraphContextMenu(root: ParentNode = document): void {
  ensureStyles();

  const unknownMenu = createPopup("unknown-word-menu");
  const unknownItem = document.createElement("button");
  unknownItem.type = "button";
  unknownItem.textContent = "Unknown word";
  unknownMenu.element.appendChild(unknownItem);

  const synonymMenu = createPopup("synonym-menu");
  const synonymLabel = document.createElement("div");
  synonymLabel.className = "menu-label";
  const dictionaryItem = document.createElement("button");
  dictionaryItem.type = "button";
  dictionaryItem.textContent = "Open Cambridge Dictionary";
  const rememberedItem = document.createElement("button");
  rememberedItem.type = "button";
  rememberedItem.textContent = "I remembered";
  synonymMenu.element.append(synonymLabel, dictionaryItem, rememberedItem);

  let clicked: ClickedWord = { word: "", node: null, start: 0, end: 0 };
  let synonymSpan: HTMLSpanElement | null = null;

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") hideAll();
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
      synonymSpan.replaceWith(document.createTextNode(word));
    }
    synonymMenu.hide();
  });

  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);

  root.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0) return;
    const target = event.target;
    hideAll();

    const synonym = target instanceof Element ? target.closest(".synonym") : null;
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
}
