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

export interface HelpDialogOptions {
  doc?: Document;
}

export interface HelpDialog {
  element: HTMLDivElement;
  show(): void;
  hide(): void;
  isOpen(): boolean;
}

export function createHelpDialog(options: HelpDialogOptions = {}): HelpDialog {
  const doc = options.doc ?? document;

  const backdrop = doc.createElement("div");
  backdrop.className = "help-dialog-backdrop";

  const panel = doc.createElement("div");
  panel.className = "help-dialog";

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
  panel.append(heading, ...groups, actions);
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

  closeButton.addEventListener("click", hide);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) hide();
  });

  return {
    element: backdrop,
    show,
    hide,
    isOpen: () => open,
  };
}
