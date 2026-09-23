import { extractClickedWord } from "./clicked-word.js";
import { ensureStyles } from "./style.js";

const MARGIN = 4;

interface MenuState {
  element: HTMLDivElement;
  item: HTMLButtonElement;
  word: string;
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
  return { element, item, word: "" };
}

export function setupParagraphContextMenu(root: ParentNode = document): void {
  let menu = createMenu();
  let open = false;

  const hide = (): void => {
    menu.element.style.display = "none";
    open = false;
  };

  const show = (x: number, y: number, word: string): void => {
    menu.word = word;
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
    if (open) console.log(menu.word || null);
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
    const word = extractClickedWord(target);
    event.preventDefault();
    show(mouseEvent.clientX, mouseEvent.clientY, word);
  });
}
