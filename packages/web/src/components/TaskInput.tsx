import { useState, useRef } from 'react';
import type { Priority } from 'shared/types';

interface TaskInputProps {
  onAdd: (title: string, priority?: Priority) => Promise<void>;
}

export function TaskInput({ onAdd }: TaskInputProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setTitle('');
      inputRef.current?.focus();
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setTitle('');
      inputRef.current?.blur();
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4) var(--space-5)',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--color-border)',
      transition: `box-shadow var(--motion-normal)`,
    }}>
      <span style={{
        color: 'var(--color-primary)',
        fontSize: 'var(--text-lg)',
        fontWeight: 'var(--weight-bold)',
        lineHeight: 1,
        userSelect: 'none',
        opacity: 0.6,
      }}>+</span>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs to be done?"
        maxLength={200}
        aria-label="New task title"
        style={{
          flex: 1,
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text)',
          lineHeight: 1.6,
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!title.trim() || submitting}
        aria-label="Add task"
        style={{
          background: title.trim() ? 'var(--color-primary)' : 'var(--color-surface-alt)',
          color: title.trim() ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          transition: `all var(--motion-normal)`,
          opacity: submitting ? 0.6 : 1,
        }}
      >
        Add
      </button>
    </div>
  );
}
