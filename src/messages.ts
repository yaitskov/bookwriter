export type Message =
  | { readonly kind: "info"; readonly text: string }
  | { readonly kind: "warning"; readonly text: string }
  | { readonly kind: "error"; readonly text: string };

export const Info = (text: string): Message => ({ kind: "info", text });
export const Warning = (text: string): Message => ({ kind: "warning", text });
export const Error = (text: string): Message => ({ kind: "error", text });

export interface Messages {
  element: HTMLDivElement;
  add(message: Message): void;
  clear(): void;
}

export function createMessages(doc: Document = document): Messages {
  const element = doc.createElement("div");
  element.className = "messages";

  let lastMessage: Message | null = null;
  let lastNode: HTMLDivElement | null = null;

  const add = (message: Message): void => {
    if (lastMessage && lastMessage.kind === message.kind && lastMessage.text === message.text) {
      return;
    }
    const item = doc.createElement("div");
    item.className = `message message-${message.kind}`;

    const close = doc.createElement("button");
    close.type = "button";
    close.className = "message-close";
    close.textContent = "\u00d7";
    close.setAttribute("aria-label", "Dismiss message");

    const text = doc.createElement("span");
    text.className = "message-text";
    text.textContent = message.text;

    close.addEventListener("click", () => {
      if (item === lastNode) {
        lastMessage = null;
        lastNode = null;
      }
      item.remove();
    });
    item.append(close, text);
    element.append(item);
    lastMessage = message;
    lastNode = item;
  };

  const clear = (): void => {
    lastMessage = null;
    lastNode = null;
    element.replaceChildren();
  };

  doc.body.append(element);
  return { element, add, clear };
}
