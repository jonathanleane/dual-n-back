import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function BigButton({ children, onClick, primary, disabled, ariaLabel }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        flex: 1,
        background: primary ? 'var(--accent)' : 'var(--surface)',
        color: primary ? 'var(--accent-fg)' : 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '18px 0',
        fontSize: '1rem',
        fontWeight: 600,
        opacity: disabled ? 0.4 : 1,
        transition: 'transform 80ms ease, opacity 80ms ease',
      }}
    >
      {children}
    </button>
  );
}
