import { useState } from 'react';
import { fetchAiSummary } from '../api';

interface AiSummaryProps {
  total: number;
  activeCount: number;
  completedCount: number;
  priorityBreakdown: { high: number; medium: number; low: number };
}

export function AiSummary({ total, activeCount, completedCount, priorityBreakdown }: AiSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAiSummary({
        total,
        completed: completedCount,
        active: activeCount,
        priorityBreakdown,
      });
      setSummary(res.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI summary unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label="Get AI progress summary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--color-primary)',
          background: 'transparent',
          border: '1px solid var(--color-border)',
          transition: `all var(--motion-fast)`,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1L9.5 5.5L14 6L10.5 9L11.5 14L8 11.5L4.5 14L5.5 9L2 6L6.5 5.5L8 1Z"
            stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
        </svg>
        {loading ? 'Thinking...' : 'AI Summary'}
      </button>

      {summary && (
        <div style={{
          marginTop: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text)',
          lineHeight: 1.6,
          fontStyle: 'italic',
        }}>
          {summary}
        </div>
      )}

      {error && (
        <p style={{
          marginTop: 'var(--space-2)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-error)',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
