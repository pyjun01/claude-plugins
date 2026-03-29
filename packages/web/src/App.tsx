import { useState, useCallback, useRef, useReducer } from 'react';
import { useTasks } from './hooks/useTasks';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { FilterBar } from './components/FilterBar';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { AiSummary } from './components/AiSummary';
import type { Priority } from 'shared/types';
import * as api from './api';

interface PendingDelete {
  id: string;
  title: string;
  timeoutId: number;
}

export default function App() {
  const {
    tasks, filter, setFilter,
    total, activeCount, completedCount,
    loading, error,
    addTask, toggleTask, deleteTask, clearCompleted, updateTask,
    priorityBreakdown,
  } = useTasks();

  const [toast, setToast] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null);
  const pendingDeleteRef = useRef<PendingDelete | null>(null);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const handleDelete = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Cancel any previous pending delete
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timeoutId);
    }

    // Show undo toast for 3 seconds before actually deleting
    const timeoutId = window.setTimeout(() => {
      deleteTask(id);
      pendingDeleteRef.current = null;
      setToast(null);
    }, 3000);

    pendingDeleteRef.current = { id, title: task.title, timeoutId };

    setToast({
      message: `"${task.title.length > 30 ? task.title.slice(0, 30) + '…' : task.title}" deleted`,
      action: {
        label: 'Undo',
        onClick: () => {
          if (pendingDeleteRef.current?.id === id) {
            clearTimeout(pendingDeleteRef.current.timeoutId);
            pendingDeleteRef.current = null;
            setToast(null);
            forceUpdate();
          }
        },
      },
    });
  }, [tasks, deleteTask]);

  const handlePriorityChange = useCallback(async (id: string, priority: Priority) => {
    await updateTask(id, undefined, priority);
  }, [updateTask]);

  // Filter out pending-delete tasks from display
  const visibleTasks = tasks.filter(t => t.id !== pendingDeleteRef.current?.id);

  return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: 'var(--space-7) var(--space-5)',
      minHeight: '100vh',
    }}>
      {/* Masthead */}
      <header style={{
        marginBottom: 'var(--space-7)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          color: 'var(--color-secondary)',
          fontWeight: 'var(--weight-normal)',
          letterSpacing: '-0.5px',
          lineHeight: 1.1,
          marginBottom: 'var(--space-2)',
        }}>
          Todo
        </h1>
        <div style={{
          width: '40px',
          height: '3px',
          background: 'var(--color-primary)',
          margin: '0 auto',
          borderRadius: 'var(--radius-full)',
        }} />
      </header>

      {/* Task Input */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <TaskInput onAdd={addTask} />
      </div>

      {/* Filter Bar */}
      {total > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <FilterBar
            filter={filter}
            onFilter={setFilter}
            activeCount={activeCount}
            completedCount={completedCount}
            total={total}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" style={{
          padding: 'var(--space-3) var(--space-4)',
          background: '#FDF2F2',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-error)',
          fontSize: 'var(--text-sm)',
          marginBottom: 'var(--space-4)',
          border: '1px solid #F5DBDB',
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-7)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
        }}>
          Loading...
        </div>
      )}

      {/* Task List */}
      {!loading && visibleTasks.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          {visibleTasks.map((task, i) => (
            <div
              key={task.id}
              style={{
                animation: `fadeInUp var(--motion-slow) both`,
                animationDelay: `${Math.min(i * 30, 300)}ms`,
              }}
            >
              <TaskItem
                task={task}
                onToggle={toggleTask}
                onDelete={handleDelete}
                onPriorityChange={handlePriorityChange}
              />
            </div>
          ))}
        </ul>
      )}

      {/* Footer */}
      {total > 0 && (
        <footer style={{
          marginTop: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border)',
        }}>
          <span style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            {activeCount} {activeCount === 1 ? 'item' : 'items'} left
          </span>

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <AiSummary
              total={total}
              activeCount={activeCount}
              completedCount={completedCount}
              priorityBreakdown={priorityBreakdown}
            />

            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                aria-label="Clear all completed tasks"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  transition: `all var(--motion-fast)`,
                }}
              >
                Clear completed
              </button>
            )}
          </div>
        </footer>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Keyframe animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
