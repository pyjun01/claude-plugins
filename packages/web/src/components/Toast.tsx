import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, action, duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
        opacity: visible ? 1 : 0,
        background: 'var(--color-secondary)',
        color: 'var(--color-text-on-primary)',
        padding: 'var(--space-3) var(--space-5)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        transition: `all var(--motion-normal)`,
        zIndex: 100,
        whiteSpace: 'nowrap',
      }}
    >
      {message}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            color: 'var(--color-accent)',
            fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-sm)',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
