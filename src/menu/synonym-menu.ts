import { createPopup, type Popup } from "./popup.js";

export interface SynonymMenu {
  popup: Popup;
  label: HTMLDivElement;
  dictionaryItem: HTMLButtonElement;
  rememberedItem: HTMLButtonElement;
  settingsItem: HTMLButtonElement;
}

export function createSynonymMenu(doc: Document): SynonymMenu {
  const popup = createPopup(doc, "synonym-menu");
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
  popup.element.append(label, dictionaryItem, rememberedItem, settingsItem);
  return { popup, label, dictionaryItem, rememberedItem, settingsItem };
}
