import { createPopup, type Popup } from "./popup.js";

export interface UnknownMenu {
  popup: Popup;
  unknownItem: HTMLButtonElement;
  settingsItem: HTMLButtonElement;
  hideItem: HTMLButtonElement;
}

export function createUnknownMenu(doc: Document): UnknownMenu {
  const popup = createPopup(doc, "unknown-word-menu");
  const unknownItem = doc.createElement("button");
  unknownItem.type = "button";
  unknownItem.textContent = "Unknown word";
  const settingsItem = doc.createElement("button");
  settingsItem.type = "button";
  settingsItem.textContent = "Settings…";
  const hideItem = doc.createElement("button");
  hideItem.type = "button";
  hideItem.textContent = "Hide (Esc)";
  popup.element.append(unknownItem, settingsItem, hideItem);
  return { popup, unknownItem, settingsItem, hideItem };
}
