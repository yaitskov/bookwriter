import type { UnknownMenu } from "../menu/unknown-menu.js";
import type { SynonymMenu } from "../menu/synonym-menu.js";
import type { SettingsDialog } from "../settings-dialog.js";

export function bindMenus(
  unknownMenu: UnknownMenu,
  synonymMenu: SynonymMenu,
  settingsDialog: SettingsDialog,
  onUnknownWord: () => void,
  onFollowLink: () => void,
  onDictionary: () => void,
  onRemembered: () => void,
): void {
  unknownMenu.unknownItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (unknownMenu.popup.isOpen()) {
      onUnknownWord();
    }
    unknownMenu.popup.hide();
  });

  const openSettings = (menu: UnknownMenu | SynonymMenu, event: MouseEvent): void => {
    event.stopPropagation();
    menu.popup.hide();
    settingsDialog.show();
  };

  unknownMenu.settingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(unknownMenu, event);
  });

  synonymMenu.settingsItem.addEventListener("click", (event: MouseEvent) => {
    openSettings(synonymMenu, event);
  });

  unknownMenu.followLinkItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    onFollowLink();
  });

  synonymMenu.followLinkItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    onFollowLink();
  });

  unknownMenu.hideItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    unknownMenu.popup.hide();
  });

  synonymMenu.dictionaryItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.popup.isOpen()) {
      onDictionary();
    }
    synonymMenu.popup.hide();
  });

  synonymMenu.rememberedItem.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (synonymMenu.popup.isOpen()) {
      onRemembered();
    }
    synonymMenu.popup.hide();
  });
}
