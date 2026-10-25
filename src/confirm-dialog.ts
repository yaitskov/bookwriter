import { lockScroll, unlockScroll } from "./scroll-lock";

export interface ConfirmDialogOptions {
  doc?: Document;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ConfirmDialog {
  element: HTMLDialogElement;
  show(message: string): Promise<boolean>;
  hide(): void;

}

export function createConfirmDialog(
  options: ConfirmDialogOptions = {},
): ConfirmDialog {
  const doc = options.doc ?? document;
  const confirmLabel = options.confirmLabel ?? "OK";
  const cancelLabel = options.cancelLabel ?? "Cancel";

  const dialog = doc.createElement("dialog");
  dialog.className = "confirm-dialog";

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
  dialog.append(message, actions);
  doc.body.append(dialog);

  let open = false;
  let resolve: ((confirmed: boolean) => void) | null = null;

  const settle = (confirmed: boolean): void => {
    const done = resolve;
    resolve = null;
    if (open) {
      open = false;
      unlockScroll(doc);
      dialog.close();
    }
    done?.(confirmed);
  };

  const hide = (): void => settle(false);

  const show = (text: string): Promise<boolean> => {
    if (resolve) settle(false);
    message.textContent = text;
    open = true;
    dialog.showModal();
    lockScroll(doc);
    return new Promise<boolean>((res) => {
      resolve = res;
    });
  };

  dialog.addEventListener("close", () => {
    if (dialog.open || !open) return;
    open = false;
    unlockScroll(doc);
    const done = resolve;
    resolve = null;
    done?.(false);
  });
  confirmButton.addEventListener("click", () => settle(true));
  cancelButton.addEventListener("click", hide);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) hide();
  });

  return { element: dialog, show, hide,   };
}
