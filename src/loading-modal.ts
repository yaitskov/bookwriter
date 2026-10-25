import { lockScroll, unlockScroll } from "./scroll-lock";

export interface LoadingModalOptions {
  doc?: Document;
  message?: string;
  onCancel?: () => void;
}

export interface LoadingModal {
  element: HTMLDialogElement;
  show(): void;
  hide(): void;
  cancelLoading(): void;

}

export function createLoadingModal(options: LoadingModalOptions = {}): LoadingModal {
  const doc = options.doc ?? document;

  const dialog = doc.createElement("dialog");
  dialog.className = "loading-modal";

  const spinner = doc.createElement("div");
  spinner.className = "loading-spinner";

  const message = doc.createElement("p");
  message.className = "loading-message";
  message.textContent = options.message ?? "Opening book…";

  const cancelButton = doc.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "loading-cancel";
  cancelButton.textContent = "Cancel";

  dialog.append(spinner, message, cancelButton);
  doc.body.append(dialog);

  let open = false;

  const show = (): void => {
    if (open) return;
    open = true;
    dialog.showModal();
    lockScroll(doc);
  };

  const finalize = (): void => {
    if (!open) return;
    open = false;
    unlockScroll(doc);
    options.onCancel?.();
  };

  const hide = (): void => {
    finalize();
    dialog.close();
  };

  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    finalize();
  });
  cancelButton.addEventListener("click", hide);

  return {
    element: dialog,
    cancelLoading: hide,
    show,
    hide,

  };
}
