import "./settings-dialog.css";
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { UserSettings } from "./settings";
import { About } from "./about";
import { WordFrequencyThreshold } from "./word-frequency-threshold";
import { VerticalTabs } from "./vertical-tabs";
import { lockScroll, unlockScroll } from "../scroll-lock";

export interface SettingsDialogOptions {
  settings: UserSettings;
  onApply: (value: number) => void;
  doc?: Document;
}

export interface SettingsDialog {
  element: HTMLDivElement;
  show(): void;
  hide(): void;
  refresh(): void;
}

export interface SettingsDialogViewProps {
  open: boolean;
  frequency: number;
  savedFrequency: number;
  onFrequencyChange: (frequency: number) => void;
  onApply: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function SettingsDialogView({
  open,
  frequency,
  savedFrequency,
  onFrequencyChange,
  onApply,
  onCancel,
  onClose,
}: SettingsDialogViewProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      onClose={(event) => {
        if (event.currentTarget.open) return;
        onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <h2>Settings</h2>
        <VerticalTabs
          ariaLabel="Settings sections"
          tabs={[
            {
              id: "word-frequency",
              label: "Word frequency",
              content: (
                <WordFrequencyThreshold
                  frequency={frequency}
                  onFrequencyChange={onFrequencyChange}
                />
              ),
            },
            {
              id: "about",
              label: "About",
              content: <About />,
            },
          ]}
        />
        <div className="settings-actions">
          <button
            type="submit"
            className="settings-apply"
            disabled={frequency === savedFrequency}
          >
            Apply
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function createSettingsDialog(options: SettingsDialogOptions): SettingsDialog {
  const { settings, onApply } = options;
  const doc = options.doc ?? document;

  const host = doc.createElement("div");
  doc.body.append(host);
  const root = createRoot(host);

  let open = false;
  let pending = settings.maximumTriggerWordFrequency();

  const render = (): void => {
    root.render(
      <SettingsDialogView
        open={open}
        frequency={pending}
        savedFrequency={settings.maximumTriggerWordFrequency()}
        onFrequencyChange={(next) => {
          pending = next;
          render();
        }}
        onApply={() => {
          onApply(pending);
          hide();
        }}
        onCancel={hide}
        onClose={() => {
          if (!open) return;
          open = false;
          render();
        }}
      />,
    );
  };

  const refresh = (): void => {
    pending = settings.maximumTriggerWordFrequency();
    render();
  };

  const show = (): void => {
    if (open) return;
    open = true;
    pending = settings.maximumTriggerWordFrequency();
    render();
    lockScroll(doc);
  };

  const hide = (): void => {
    if (!open) return;
    open = false;
    render();
    unlockScroll(doc);
  };

  refresh();

  return {
    element: host,
    show,
    hide,
    refresh,
  };
}
