import { createPopup, type Popup } from "./popup";

export interface UnknownMenu {
  popup: Popup;
  followLinkItem: HTMLButtonElement;
  unknownItem: HTMLButtonElement;
  settingsItem: HTMLButtonElement;
  hideItem: HTMLButtonElement;
}

export function createUnknownMenu(doc: Document): UnknownMenu {
  const popup = createPopup(doc, "unknown-word-menu");
  const followLinkItem = doc.createElement("button");
  followLinkItem.type = "button";
  followLinkItem.textContent = "Follow the link";
  followLinkItem.style.display = "none";
  const unknownItem = doc.createElement("button");
  unknownItem.type = "button";
  unknownItem.textContent = "Unknown word";
  const settingsItem = doc.createElement("button");
  settingsItem.type = "button";
  settingsItem.textContent = "Settings…";
  const hideItem = doc.createElement("button");
  hideItem.type = "button";
  hideItem.textContent = "Hide (Esc)";
  popup.element.append(followLinkItem, unknownItem, settingsItem, hideItem);
  return { popup, followLinkItem, unknownItem, settingsItem, hideItem };
}
