export interface LoadingModalOptions {
  doc?: Document;
  message?: string;
  onCancel?: () => void;
}

export interface LoadingModal {
  element: HTMLDivElement;
  show(): void;
  hide(): void;
  isOpen(): boolean;
}

export function createLoadingModal(options: LoadingModalOptions = {}): LoadingModal {
  const doc = options.doc ?? document;

  const backdrop = doc.createElement("div");
  backdrop.className = "loading-modal-backdrop";

  const panel = doc.createElement("div");
  panel.className = "loading-modal";

  const spinner = doc.createElement("div");
  spinner.className = "loading-spinner";

  const message = doc.createElement("p");
  message.className = "loading-message";
  message.textContent = options.message ?? "Opening book…";

  const cancelButton = doc.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "loading-cancel";
  cancelButton.textContent = "Cancel";

  panel.append(spinner, message, cancelButton);
  backdrop.append(panel);
  doc.body.append(backdrop);

  let open = false;

  const show = (): void => {
    backdrop.style.display = "flex";
    open = true;
  };

  const hide = (): void => {
    backdrop.style.display = "none";
    open = false;
  };

  cancelButton.addEventListener("click", () => {
    options.onCancel?.();
  });

  return {
    element: backdrop,
    show,
    hide,
    isOpen: () => open,
  };
}
