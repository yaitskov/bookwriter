const MIN_EXPONENT = -9;
const MAX_EXPONENT = 0;
const STEPS = 1000;
const MIN_FREQUENCY = 10 ** MIN_EXPONENT;
const EPSILON = 1e-12;

export interface WordFrequencyThresholdProps {
  frequency: number;
  onFrequencyChange: (frequency: number) => void;
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

export function WordFrequencyThreshold({
  frequency,
  onFrequencyChange,
}: WordFrequencyThresholdProps): React.JSX.Element {
  const clamped = clampFrequency(frequency);

  return (
    <>
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
    </>
  );
}
