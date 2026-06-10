interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export default function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        background: checked ? 'var(--success)' : 'var(--surface-deep)',
        borderRadius: 999,
        position: 'relative',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 100ms ease',
        }}
      />
    </button>
  );
}
