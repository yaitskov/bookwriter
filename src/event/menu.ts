import type { UnknownMenu } from "../menu/unknown-menu";
import type { SynonymMenu } from "../menu/synonym-menu";
import type { App } from "../app";

export function bindMenus(
  unknownMenu: UnknownMenu,
  synonymMenu: SynonymMenu,
  app: App,
): void {
  unknownMenu.unknownItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (unknownMenu.popup.isOpen()) {
      app.onUnknownWord();
    }
    unknownMenu.popup.hide();
  });

  const openSettings = (menu: UnknownMenu | SynonymMenu, event: MouseEvent): void => {
    event.stopPropagation();
    menu.popup.hide();
    app.settingsDialog.show();
  };

  unknownMenu.settingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(unknownMenu, event);
  });

  synonymMenu.settingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(synonymMenu, event);
  });

  unknownMenu.followLinkItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    app.followLink();
  });

  synonymMenu.followLinkItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    app.followLink();
  });

  unknownMenu.hideItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    unknownMenu.popup.hide();
  });

  synonymMenu.dictionaryItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.popup.isOpen()) {
      app.onDictionary();
    }
    synonymMenu.popup.hide();
  });

  synonymMenu.rememberedItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.popup.isOpen()) {
      app.onRemembered();
    }
    synonymMenu.popup.hide();
  });
}
