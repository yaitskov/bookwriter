import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { UserSettings } from "./settings";
import { lockScroll, unlockScroll } from "../scroll-lock";

const MIN_EXPONENT = -9;
const MAX_EXPONENT = 0;
const STEPS = 1000;
const MIN_FREQUENCY = 10 ** MIN_EXPONENT;
const EPSILON = 1e-12;

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

function clampFrequency(frequency: number): number {
  if (!Number.isFinite(frequency)) return MIN_FREQUENCY;
  return Math.min(1, Math.max(MIN_FREQUENCY, frequency));
}

export function frequencyToSlider(frequency: number): number {
  const position =
    (Math.log10(clampFrequency(frequency)) - MIN_EXPONENT) / (MAX_EXPONENT - MIN_EXPONENT);
  return Math.min(STEPS, Math.max(0, Math.round(position * STEPS)));
}

export function sliderToFrequency(position: number): number {
  const step = Math.min(STEPS, Math.max(0, Math.round(position)));
  return clampFrequency(10 ** (MIN_EXPONENT + (step / STEPS) * (MAX_EXPONENT - MIN_EXPONENT)));
}

export function formatFrequency(frequency: number): string {
  if (frequency <= EPSILON) return "0";
  return frequency.toExponential(2);
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
  const clamped = clampFrequency(frequency);

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
        <label htmlFor="maximum-trigger-word-frequency">
          Maximum trigger word frequency
        </label>
        <input
          id="maximum-trigger-word-frequency"
          type="range"
          min="0"
          max={STEPS}
          step="1"
          value={frequencyToSlider(frequency)}
          onChange={(event) =>
            onFrequencyChange(sliderToFrequency(Number(event.currentTarget.value)))
          }
        />
        <div className="settings-scale">
          <span className="settings-scale-rare">
            <span>???</span>
            <span>aadvark</span>
          </span>
          <span className="settings-scale-middle">cat</span>
          <span className="settings-scale-common">the</span>
        </div>
        <div className="settings-value">
          {formatFrequency(clamped)} (10^{Math.log10(clamped).toFixed(2)})
        </div>
        <p className="settings-hint">
          Greater value replaces more words with common synonyms.
        </p>
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
