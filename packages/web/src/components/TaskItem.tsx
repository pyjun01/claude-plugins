import { useState } from 'react';
import type { Task, Priority } from 'shared/types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
  onPriorityChange: (id: string, priority: Priority) => Promise<void>;
}

const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high'];
const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
};

export function TaskItem({ task, onToggle, onDelete, onPriorityChange }: TaskItemProps) {
  const [toggling, setToggling] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggle(task.id);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = () => {
    setExiting(true);
    // brief slide-out animation, then delete
    setTimeout(() => onDelete(task.id), 300);
  };

  const cyclePriority = async () => {
    const idx = PRIORITY_ORDER.indexOf(task.priority);
    const next = PRIORITY_ORDER[(idx + 1) % 3];
    await onPriorityChange(task.id, next);
  };

  const priorityColor =
    task.completed ? 'var(--color-completed)' :
    task.priority === 'high' ? 'var(--color-priority-high)' :
    task.priority === 'medium' ? 'var(--color-priority-medium)' :
    'var(--color-priority-low)';

  return (
    <li
      role="listitem"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        transition: `all var(--motion-normal), transform var(--motion-slow), opacity var(--motion-slow)`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(40px)' : 'translateX(0)',
        minHeight: '52px',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
        style={{
          width: '22px',
          height: '22px',
          minWidth: '22px',
          borderRadius: 'var(--radius-sm)',
          border: `2px solid ${task.completed ? 'var(--color-completed)' : 'var(--color-primary)'}`,
          background: task.completed ? 'var(--color-completed)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: `all var(--motion-spring)`,
          flexShrink: 0,
        }}
      >
        {task.completed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="var(--color-surface)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 'var(--text-base)',
          color: task.completed ? 'var(--color-completed)' : 'var(--color-text)',
          textDecoration: task.completed ? 'line-through' : 'none',
          textDecorationColor: 'var(--color-completed)',
          transition: `color var(--motion-normal)`,
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      <button
        onClick={cyclePriority}
        aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}. Click to change.`}
        title={PRIORITY_LABELS[task.priority]}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-medium)',
          color: priorityColor,
          background: 'transparent',
          transition: `all var(--motion-fast)`,
          flexShrink: 0,
        }}
      >
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: priorityColor,
          transition: `background var(--motion-fast)`,
        }} />
        <span style={{ fontSize: 'var(--text-xs)' }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        aria-label={`Delete "${task.title}"`}
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
          padding: 'var(--space-1)',
          borderRadius: 'var(--radius-sm)',
          transition: `color var(--motion-fast)`,
          opacity: 0.4,
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.color = 'var(--color-error)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.4';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
