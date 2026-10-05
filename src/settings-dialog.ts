import type { UserSettings } from "./settings.js";

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
  isOpen(): boolean;
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

export function createSettingsDialog(options: SettingsDialogOptions): SettingsDialog {
  const { settings, onApply } = options;
  const doc = options.doc ?? document;

  const backdrop = doc.createElement("div");
  backdrop.className = "settings-dialog-backdrop";

  const panel = doc.createElement("div");
  panel.className = "settings-dialog";

  const form = doc.createElement("form");

  const heading = doc.createElement("h2");
  heading.textContent = "Settings";

  const label = doc.createElement("label");
  label.htmlFor = "maximum-trigger-word-frequency";
  label.textContent = "Maximum trigger word frequency";

  const slider = doc.createElement("input");
  slider.id = "maximum-trigger-word-frequency";
  slider.type = "range";
  slider.min = "0";
  slider.max = String(STEPS);
  slider.step = "1";

  const readout = doc.createElement("div");
  readout.className = "settings-value";

  const hint = doc.createElement("p");
  hint.className = "settings-hint";
  hint.textContent =
    "Greater value replaces more words with common synonyms.";

  const actions = doc.createElement("div");
  actions.className = "settings-actions";

  const applyButton = doc.createElement("button");
  applyButton.type = "submit";
  applyButton.className = "settings-apply";
  applyButton.textContent = "Apply";

  const cancelButton = doc.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";

  actions.append(applyButton, cancelButton);
  form.append(heading, label, slider, readout, hint, actions);
  panel.append(form);
  backdrop.append(panel);
  doc.body.append(backdrop);

  let open = false;
  let pending = settings.maximumTriggerWordFrequency();

  const showValue = (frequency: number): void => {
    const clamped = clampFrequency(frequency);
    readout.textContent = `${formatFrequency(clamped)} (10^${Math.log10(clamped).toFixed(2)})`;
    applyButton.disabled = frequency === settings.maximumTriggerWordFrequency();
  };

  const refresh = (): void => {
    pending = settings.maximumTriggerWordFrequency();
    slider.value = String(frequencyToSlider(pending));
    showValue(pending);
  };

  const show = (): void => {
    refresh();
    backdrop.style.display = "block";
    open = true;
  };

  const hide = (): void => {
    backdrop.style.display = "none";
    open = false;
  };

  slider.addEventListener("input", () => {
    pending = sliderToFrequency(Number(slider.value));
    showValue(pending);
  });

  form.addEventListener("submit", (event: Event) => {
    event.preventDefault();
    onApply(sliderToFrequency(Number(slider.value)));
    hide();
  });

  cancelButton.addEventListener("click", hide);

  refresh();

  return {
    element: backdrop,
    show,
    hide,
    isOpen: () => open,
    refresh,
  };
}
