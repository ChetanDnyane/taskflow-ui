import type { Task, TaskPriority, TaskStatus } from '../types';

// #region Calendar dates must not shift with UTC offsets
// Spring's LocalDate arrives as YYYY-MM-DD. Construct local midnight for display;
// new Date('YYYY-MM-DD') would interpret UTC and could show the previous day.
// ISO calendar strings can be compared directly for overdue filtering.
// #endregion
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function formatDueDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
export function isOverdue(task: Task, today = todayISO()) {
  return task.status !== 'COMPLETED' && !!task.dueDate && task.dueDate < today;
}
export type TaskView = 'all' | 'today' | 'upcoming' | 'completed';
export interface Filters {
  view: TaskView;
  search: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  sort: 'newest' | 'due' | 'priority';
}
export function selectTasks(tasks: Task[], filters: Filters, today = todayISO()) {
  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return tasks
    .filter((task) => {
      if (filters.view === 'today' && (task.dueDate !== today || task.status === 'COMPLETED'))
        return false;
      if (
        filters.view === 'upcoming' &&
        (!task.dueDate || task.dueDate <= today || task.status === 'COMPLETED')
      )
        return false;
      if (filters.view === 'completed' && task.status !== 'COMPLETED') return false;
      return (
        (!filters.status || task.status === filters.status) &&
        (!filters.priority || task.priority === filters.priority) &&
        `${task.title} ${task.description || ''}`
          .toLowerCase()
          .includes(filters.search.trim().toLowerCase())
      );
    })
    .sort((a, b) => {
      if (filters.sort === 'due')
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.id - a.id;
      if (filters.sort === 'priority') return rank[a.priority] - rank[b.priority] || b.id - a.id;
      return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
    });
}
