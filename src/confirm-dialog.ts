import { lockScroll, unlockScroll } from "./scroll-lock";

export interface ConfirmDialogOptions {
  doc?: Document;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ConfirmDialog {
  element: HTMLDivElement;
  show(message: string): Promise<boolean>;
  hide(): void;
  isOpen(): boolean;
}

export function createConfirmDialog(
  options: ConfirmDialogOptions = {},
): ConfirmDialog {
  const doc = options.doc ?? document;
  const confirmLabel = options.confirmLabel ?? "OK";
  const cancelLabel = options.cancelLabel ?? "Cancel";

  const backdrop = doc.createElement("div");
  backdrop.className = "confirm-dialog-backdrop";

  const panel = doc.createElement("div");
  panel.className = "confirm-dialog";

  const message = doc.createElement("p");
  message.className = "confirm-message";

  const actions = doc.createElement("div");
  actions.className = "confirm-actions";

  const confirmButton = doc.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = "confirm-primary";
  confirmButton.textContent = confirmLabel;

  const cancelButton = doc.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = cancelLabel;

  actions.append(confirmButton, cancelButton);
  panel.append(message, actions);
  backdrop.append(panel);
  doc.body.append(backdrop);

  let open = false;
  let resolve: ((confirmed: boolean) => void) | null = null;

  const settle = (confirmed: boolean): void => {
    if (!resolve) return;
    const done = resolve;
    resolve = null;
    backdrop.style.display = "none";
    open = false;
    unlockScroll(doc);
    done(confirmed);
  };

  const hide = (): void => settle(false);

  const show = (text: string): Promise<boolean> => {
    if (resolve) settle(false);
    message.textContent = text;
    backdrop.style.display = "flex";
    open = true;
    lockScroll(doc);
    return new Promise<boolean>((res) => {
      resolve = res;
    });
  };

  confirmButton.addEventListener("click", () => settle(true));
  cancelButton.addEventListener("click", hide);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) hide();
  });

  return { element: backdrop, show, hide, isOpen: () => open };
}
