import { createPopup, type Popup } from "./popup.js";

export interface SynonymMenu {
  popup: Popup;
  followLinkItem: HTMLButtonElement;
  label: HTMLDivElement;
  dictionaryItem: HTMLButtonElement;
  rememberedItem: HTMLButtonElement;
  settingsItem: HTMLButtonElement;
}

export function createSynonymMenu(doc: Document): SynonymMenu {
  const popup = createPopup(doc, "synonym-menu");
  const followLinkItem = doc.createElement("button");
  followLinkItem.type = "button";
  followLinkItem.textContent = "Follow the link";
  followLinkItem.style.display = "none";
  const label = doc.createElement("div");
  label.className = "menu-label";
  const dictionaryItem = doc.createElement("button");
  dictionaryItem.type = "button";
  dictionaryItem.textContent = "Open Cambridge Dictionary";
  const rememberedItem = doc.createElement("button");
  rememberedItem.type = "button";
  rememberedItem.textContent = "I remembered";
  const settingsItem = doc.createElement("button");
  settingsItem.type = "button";
  settingsItem.textContent = "Settings…";
  popup.element.append(followLinkItem, label, dictionaryItem, rememberedItem, settingsItem);
  return { popup, followLinkItem, label, dictionaryItem, rememberedItem, settingsItem };
}
