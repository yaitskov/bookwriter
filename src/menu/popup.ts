const MARGIN = 4;

export interface Popup {
  element: HTMLDivElement;
  show(x: number, y: number): void;
  hide(): void;
  isOpen(): boolean;
  contains(target: Node): boolean;
}

export const popups: Popup[] = [];

export function createPopup(doc: Document, id: string): Popup {
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
