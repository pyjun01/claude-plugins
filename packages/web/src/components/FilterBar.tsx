import type { TaskFilter } from 'shared/types';

interface FilterBarProps {
  filter: TaskFilter;
  onFilter: (f: TaskFilter) => void;
  activeCount: number;
  completedCount: number;
  total: number;
}

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Done' },
];

export function FilterBar({ filter, onFilter, activeCount, completedCount, total }: FilterBarProps) {
  const getCount = (f: TaskFilter) => {
    if (f === 'all') return total;
    if (f === 'active') return activeCount;
    return completedCount;
  };

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-2)',
      padding: 'var(--space-1)',
      background: 'var(--color-surface-alt)',
      borderRadius: 'var(--radius-md)',
    }}>
      {FILTERS.map(f => {
        const active = filter === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onFilter(f.value)}
            aria-pressed={active}
            aria-label={`Show ${f.label.toLowerCase()} tasks`}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              fontWeight: active ? 'var(--weight-medium)' : 'var(--weight-normal)',
              color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
              background: active ? 'var(--color-surface)' : 'transparent',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: `all var(--motion-fast)`,
            }}
          >
            {f.label}
            <span style={{
              marginLeft: 'var(--space-1)',
              fontSize: 'var(--text-xs)',
              opacity: 0.7,
            }}>
              {getCount(f.value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
