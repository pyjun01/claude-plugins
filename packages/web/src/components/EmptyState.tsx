import type { TaskFilter } from 'shared/types';

interface EmptyStateProps {
  filter: TaskFilter;
}

export function EmptyState({ filter }: EmptyStateProps) {
  const isAllDone = filter === 'active';
  const isNoCompleted = filter === 'completed';

  let heading: string;
  let subtext: string;
  let icon: string;

  if (isAllDone) {
    heading = 'All caught up!';
    subtext = 'No active tasks. Take a moment to breathe.';
    icon = '✓';
  } else if (isNoCompleted) {
    heading = 'Nothing completed yet';
    subtext = 'Your completed tasks will appear here.';
    icon = '○';
  } else {
    heading = 'A fresh start';
    subtext = 'Add your first task above to get going.';
    icon = '□';
  }

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-5)',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface-alt)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--text-xl)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--space-5)',
        border: '1px solid var(--color-border)',
      }}>
        {icon}
      </div>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-lg)',
        color: 'var(--color-text)',
        marginBottom: 'var(--space-2)',
        fontWeight: 'var(--weight-normal)',
      }}>
        {heading}
      </h2>
      <p style={{
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-secondary)',
        maxWidth: '280px',
      }}>
        {subtext}
      </p>
    </div>
  );
}
