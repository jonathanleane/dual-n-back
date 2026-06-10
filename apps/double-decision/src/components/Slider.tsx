interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}

export default function Slider({ value, min, max, step = 1, onChange, ariaLabel }: Props) {
  return (
    <input
      type="range"
      aria-label={ariaLabel}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--accent)' }}
    />
  );
}
