import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** When true (during play), the layout fills the viewport and removes the narrow gutter. */
  fullBleed?: boolean;
}

export default function Layout({ children, fullBleed = false }: Props) {
  return (
    <div
      style={{
        maxWidth: fullBleed ? '100%' : 480,
        margin: '0 auto',
        minHeight: '100dvh',
        padding: fullBleed ? 0 : '24px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}
