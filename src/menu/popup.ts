const MARGIN = 4;

export interface Popup {
  element: HTMLDivElement;
  show(x: number, y: number): void;
  hide(): void;
  isOpen(): boolean;
  contains(target: Node): boolean;
  focusNext(): void;
  focusPrevious(): void;
  clickFocused(): void;
}

export const popups: Popup[] = [];

export function getOpenPopup(): Popup | null {
  return popups.find((popup) => popup.isOpen()) ?? null;
}

export function isAnyPopupOpen(): boolean {
  return getOpenPopup() !== null;
}

export function hideAll(): void {
  for (const popup of popups) popup.hide();
}

export function createPopup(doc: Document, id: string): Popup {
  const element = doc.createElement("div");
  element.id = id;
  element.className = "word-menu";
  let open = false;

  const visibleButtons = (): HTMLButtonElement[] =>
    Array.from(element.querySelectorAll("button")).filter(
      (button) => !button.disabled && button.getClientRects().length > 0,
    );

  const focusOnHover = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button");
    if (button instanceof HTMLButtonElement && !button.disabled) button.focus();
  };
  element.addEventListener("mouseover", focusOnHover);

  const focusStep = (delta: number): void => {
    const buttons = visibleButtons();
    if (buttons.length === 0) return;
    const current = buttons.indexOf(doc.activeElement as HTMLButtonElement);
    const index = current < 0
      ? (delta > 0 ? 0 : buttons.length - 1)
      : (current + delta + buttons.length) % buttons.length;
    buttons[index]?.focus();
  };

  const clickFocused = (): void => {
    const buttons = visibleButtons();
    const active = doc.activeElement;
    if (active instanceof HTMLButtonElement && buttons.includes(active)) {
      active.click();
      return;
    }
    buttons[0]?.click();
  };

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
    visibleButtons()[0]?.focus();
  };

  const hide = (): void => {
    const active = doc.activeElement;
    if (active instanceof HTMLElement && element.contains(active)) active.blur();
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
    focusNext: () => focusStep(1),
    focusPrevious: () => focusStep(-1),
    clickFocused,
  };
  popups.push(popup);
  return popup;
}
