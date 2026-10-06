const DEFAULT_ACCEPT = ".epub";

export interface LoadBookFileOptions {
  doc?: Document;
  accept?: string;
}

export function loadBookFile(options: LoadBookFileOptions = {}): Promise<Uint8Array> {
  const doc = options.doc ?? document;
  const accept = options.accept ?? DEFAULT_ACCEPT;

  return new Promise<Uint8Array>((resolve, reject) => {
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    doc.body.append(input);

    let settled = false;

    const cleanup = (): void => {
      window.removeEventListener("focus", onWindowFocus);
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      input.remove();
    };

    const finish = (action: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };

    const onCancel = (): void => {
      finish(() => reject(new Error("no file selected")));
    };

    const onChange = (): void => {
      const file = input.files?.[0];
      if (!file) {
        onCancel();
        return;
      }
      file
        .arrayBuffer()
        .then((buffer) => finish(() => resolve(new Uint8Array(buffer))))
        .catch((error) => finish(() => reject(error)));
    };

    const onWindowFocus = (): void => {
      window.setTimeout(() => {
        if (settled) return;
        if (!input.files || input.files.length === 0) onCancel();
      }, 0);
    };

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    window.addEventListener("focus", onWindowFocus);

    input.click();
  });
}
