import { extractClickedWord, type ClickedWord } from "./clicked-word.js";
import { extractSentence } from "./sentence.js";
import { ensureStyles } from "./style.js";
import { createThesaurus } from "./thesaurus.js";

const MARGIN = 4;
const thesaurus = createThesaurus();

interface MenuState {
  element: HTMLDivElement;
  item: HTMLButtonElement;
  clicked: ClickedWord;
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

function createMenu(): MenuState {
  ensureStyles();
  const element = document.createElement("div");
  element.id = "unknown-word-menu";
  const item = document.createElement("button");
  item.type = "button";
  item.textContent = "Unknown word";
  element.appendChild(item);
  document.body.appendChild(element);
  return { element, item, clicked: { word: "", node: null, start: 0, end: 0 } };
}

export function setupParagraphContextMenu(root: ParentNode = document): void {
  let menu = createMenu();
  let open = false;

  const hide = (): void => {
    menu.element.style.display = "none";
    open = false;
  };

  const show = (x: number, y: number, clicked: ClickedWord): void => {
    menu.clicked = clicked;
    menu.element.style.visibility = "hidden";
    menu.element.style.display = "block";
    const { width, height } = menu.element.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - width - MARGIN);
    const top = Math.min(y, window.innerHeight - height - MARGIN);
    menu.element.style.left = `${Math.max(MARGIN, left)}px`;
    menu.element.style.top = `${Math.max(MARGIN, top)}px`;
    menu.element.style.visibility = "visible";
    open = true;
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") hide();
  };

  const onDocClick = (event: MouseEvent): void => {
    if (open && !menu.element.contains(event.target as Node)) hide();
  };

  menu.item.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (open) {
      const { word, node } = menu.clicked;
      console.log(word || null);
      if (node) {
        const span = wrapWord(menu.clicked);
        if (span) {
          const sentence = extractSentence(span);
          console.log(sentence);
          void thesaurus
            .findSynonym(word, sentence)
            .then((synonym) => console.log(synonym))
            .catch((error) => console.error(error));
        }
      }
    }
    hide();
  });

  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);

  root.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0) return;
    const target = event.target;
    if (!(target instanceof HTMLParagraphElement)) return;
    if (open) hide();
    const clicked = extractClickedWord(target);
    event.preventDefault();
    show(mouseEvent.clientX, mouseEvent.clientY, clicked);
  });
}