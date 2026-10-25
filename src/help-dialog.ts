type Shortcut = { readonly keys: string; readonly action: string };

type ShortcutGroup = { readonly title: string; readonly shortcuts: ReadonlyArray<Shortcut> };

const GROUPS: ReadonlyArray<ShortcutGroup> = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: "← / →", action: "Previous / next chapter" },
      { keys: "↑ or Shift+Space", action: "Previous chapter when at the top" },
      { keys: "↓ or Space", action: "Next chapter when at the bottom" },
      { keys: "c", action: "Go to book content" },
    ],
  },
  {
    title: "Book",
    shortcuts: [
      { keys: "o", action: "Open a new book" },
      { keys: "q", action: "Close the book" },
      { keys: "r", action: "Remove the open book from the library" },
    ],
  },
  {
    title: "Help",
    shortcuts: [
      { keys: "h / k", action: "Show this help" },
      { keys: "s", action: "Open settings" },
      { keys: "Esc", action: "Close menus and dialogs" },
    ],
  },
  {
    title: "Mouse",
    shortcuts: [
      { keys: "Ctrl/Cmd + click", action: "Follow the link" },
    ],
  },
];

import { lockScroll, unlockScroll } from "./scroll-lock";

export interface HelpDialogOptions {
  doc?: Document;
}

export interface HelpDialog {
  element: HTMLDialogElement;
  show(): void;
  hide(): void;

}

export function createHelpDialog(options: HelpDialogOptions = {}): HelpDialog {
  const doc = options.doc ?? document;

  const dialog = doc.createElement("dialog");
  dialog.className = "help-dialog";

  const heading = doc.createElement("h2");
  heading.textContent = "Keyboard shortcuts";

  const groups = GROUPS.map((group) => {
    const section = doc.createElement("section");
    section.className = "shortcut-group";

    const title = doc.createElement("h3");
    title.textContent = group.title;

    const list = doc.createElement("dl");
    list.className = "shortcut-list";

    group.shortcuts.forEach((shortcut) => {
      const keys = doc.createElement("dt");
      keys.className = "shortcut-keys";
      keys.textContent = shortcut.keys;

      const action = doc.createElement("dd");
      action.className = "shortcut-action";
      action.textContent = shortcut.action;

      list.append(keys, action);
    });

    section.append(title, list);
    return section;
  });

  const actions = doc.createElement("div");
  actions.className = "help-actions";

  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";

  actions.append(closeButton);
  dialog.append(heading, ...groups, actions);
  doc.body.append(dialog);

  let open = false;

  const show = (): void => {
    if (open) return;
    open = true;
    dialog.showModal();
    lockScroll(doc);
  };

  const hide = (): void => {
    if (!open) return;
    open = false;
    unlockScroll(doc);
    dialog.close();
  };

  dialog.addEventListener("close", () => {
    if (dialog.open || !open) return;
    open = false;
    unlockScroll(doc);
  });
  closeButton.addEventListener("click", hide);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) hide();
  });

  return {
    element: dialog,
    show,
    hide,

  };
}
