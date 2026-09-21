import { useState } from 'react';
import {
  CalendarDays,
  CalendarRange,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  LayoutGrid,
  List,
  ListTodo,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, Outlet, useSearchParams } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { ErrorNotice, Loading } from '../../components/Feedback';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { signedOut } from '../auth/authSlice';
import { useGetTasksQuery } from '../../services/api';
import { apiError } from '../../lib/errors';
import {
  formatDueDate,
  isOverdue,
  selectTasks,
  todayISO,
  type Filters,
  type TaskView,
} from '../../lib/tasks';
import {
  priorities,
  priorityLabels,
  statuses,
  statusLabels,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../../types';

// #region Server cache stays in RTK Query; filtering and layout are presentation state
// All task views are derived from the authenticated /tasks response. Sidebar views
// use the URL for navigation; search, priority and sorting never mutate server data.
// Mutations invalidate the cache only after their response and trigger a fresh list.
// #endregion
const navigation = [
  { key: 'all', label: 'All tasks', icon: LayoutGrid },
  { key: 'today', label: 'Today', icon: CalendarDays },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarRange },
  { key: 'completed', label: 'Completed', icon: CircleCheck },
] as const;
export function Workspace() {
  const session = useAppSelector((state) => state.auth.session)!;
  const dispatch = useAppDispatch();
  const {
    data: tasks = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetTasksQuery(undefined, { refetchOnFocus: true, refetchOnReconnect: true });
  const [params, setParams] = useSearchParams();
  const requestedView = params.get('view');
  const view: TaskView = navigation.some((item) => item.key === requestedView)
    ? (requestedView as TaskView)
    : 'all';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [sort, setSort] = useState<Filters['sort']>('newest');
  const [layout, setLayout] = useState<'board' | 'list'>('board');
  const filtered = selectTasks(tasks, { view, search, status, priority, sort });
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const overdue = tasks.filter((task) => isOverdue(task)).length;
  const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const title = navigation.find((item) => item.key === view)!.label;
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  const count = (key: TaskView) =>
    key === 'all'
      ? tasks.length
      : key === 'completed'
        ? completed
        : tasks.filter(
            (task) =>
              task.status !== 'COMPLETED' &&
              task.dueDate &&
              (key === 'today' ? task.dueDate === todayISO() : task.dueDate > todayISO()),
          ).length;
  function changeView(next: TaskView) {
    setParams(next === 'all' ? {} : { view: next });
    setStatus('');
    setPriority('');
    setSearch('');
  }
  function clearFilters() {
    setSearch('');
    setStatus('');
    setPriority('');
  }
  return (
    <div className="workspace">
      <a href="#task-content" className="skip-link">
        Skip to tasks
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">P</span>
          <div>
            Personal workspace<small>YOUR SPACE TO MAKE PROGRESS</small>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Task views">
          {navigation.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => changeView(key)}
              className={`nav-item ${view === key ? 'active' : ''}`}
              aria-current={view === key ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              <span className="nav-count">{isLoading || error ? '—' : count(key)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={21} />
          <strong>
            Small steps.
            <br />
            Real progress.
          </strong>
          <p>You don’t have to do it all today. Just the next thing.</p>
        </div>
        <div className="account">
          <span className="account-avatar">{session.email[0]?.toUpperCase()}</span>
          <div>
            <strong>Your account</strong>
            <span title={session.email}>{session.email}</span>
          </div>
          <button
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => dispatch(signedOut())}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">{date}</span>
            <span className="header-avatar" title={session.email}>
              {session.email[0]?.toUpperCase()}
            </span>
          </div>
        </header>
        <main className="main-content" id="task-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">A LITTLE FOCUS GOES A LONG WAY</div>
              <h1>
                {title}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === 'all'
                  ? 'Everything you’re working on, in one clear view.'
                  : view === 'today'
                    ? 'A little focus for the things due today.'
                    : view === 'upcoming'
                      ? 'See what’s ahead. Give yourself room to plan.'
                      : 'Take a moment to appreciate what you’ve done.'}
              </p>
            </div>
            <Link to="/tasks/new" className="button primary">
              <Plus size={19} />
              New task
            </Link>
          </div>
          <section className="stats-grid" aria-label="Workspace overview">
            {[
              {
                label: 'Total tasks',
                value: tasks.length,
                icon: ListTodo,
                tone: 'violet',
                foot: 'A place for every plan',
              },
              {
                label: 'In progress',
                value: inProgress,
                icon: Clock3,
                tone: 'blue',
                foot: 'Keep the momentum going',
              },
              {
                label: 'Completed',
                value: completed,
                icon: CheckCheck,
                tone: 'green',
                foot: 'One step closer',
              },
              {
                label: 'Overdue',
                value: overdue,
                icon: CalendarDays,
                tone: 'orange',
                foot: 'Ready for a fresh look',
              },
            ].map(({ label, value, icon: Icon, tone, foot }) => (
              <div className="stat-card" key={label}>
                <div className="stat-top">
                  <span>{label}</span>
                  <span className={`stat-icon ${tone}`}>
                    <Icon size={19} />
                  </span>
                </div>
                <strong>{isLoading || error ? '—' : value.toString().padStart(2, '0')}</strong>
                <span className="stat-foot">{foot}</span>
              </div>
            ))}
          </section>
          <div className="section-bar">
            <div>
              <h2>Your task space</h2>
              <span className="result-count" aria-live="polite">
                {isLoading || error ? '—' : filtered.length} tasks
              </span>
            </div>
            <div className="layout-switch" aria-label="Task layout">
              <button aria-pressed={layout === 'board'} onClick={() => setLayout('board')}>
                <LayoutGrid size={16} />
                Board
              </button>
              <button aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>
                <List size={17} />
                List
              </button>
            </div>
          </div>
          <div className="toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                aria-label="Search tasks"
                placeholder="Search your tasks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="icon-button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="filters">
              <SlidersHorizontal size={17} className="filter-icon" />
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
              >
                <option value="">All priorities</option>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabels[p]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Sort tasks"
                value={sort}
                onChange={(e) => setSort(e.target.value as Filters['sort'])}
              >
                <option value="newest">Newest first</option>
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
              </select>
              <button
                className="icon-button refresh"
                aria-label="Refresh tasks"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw size={17} className={isFetching ? 'spin' : ''} />
              </button>
            </div>
          </div>
          {error ? (
            <div className="query-error">
              <ErrorNotice message={apiError(error).message} />
              <button className="button secondary" onClick={() => void refetch()}>
                Try again
              </button>
            </div>
          ) : isLoading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <section className="empty-state">
              <div className="empty-icon">
                <ListTodo size={32} />
              </div>
              <h2>
                {tasks.length === 0 ? 'A clear space. A fresh start.' : 'Nothing here just yet.'}
              </h2>
              <p>
                {tasks.length === 0
                  ? 'Add your first task and turn a little intention into action.'
                  : 'Try a different view or adjust your filters.'}
              </p>
              {search || status || priority ? (
                <button className="button secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link to="/tasks/new" className="button primary">
                  <Plus size={17} />
                  Create a task
                </Link>
              )}
            </section>
          ) : layout === 'board' ? (
            <div className="board">
              {statuses.map((s) => (
                <section className={`board-column ${s}`} key={s} aria-label={statusLabels[s]}>
                  <div className="column-heading">
                    <span className={`status-dot ${s}`} />
                    <h3>{statusLabels[s]}</h3>
                    <span className="column-count">
                      {filtered.filter((t) => t.status === s).length}
                    </span>
                    {s === 'TODO' && (
                      <Link to="/tasks/new" className="icon-button" aria-label="Add task to To do">
                        <Plus size={17} />
                      </Link>
                    )}
                  </div>
                  <div className="column-cards">
                    {filtered
                      .filter((t) => t.status === s)
                      .map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    {!filtered.some((t) => t.status === s) && (
                      <div className="column-empty">
                        {s === 'COMPLETED'
                          ? 'Your next small win goes here.'
                          : s === 'IN_PROGRESS'
                            ? 'Ready when you are.'
                            : 'All clear for now.'}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="task-list">
              {filtered.map((task) => (
                <TaskCard key={task.id} task={task} list />
              ))}
            </div>
          )}
          {!isLoading && !error && tasks.length > 0 && (
            <footer className="progress-footer">
              <span>
                <span className="progress-icon">
                  <Check size={14} />
                </span>
                {completed} of {tasks.length} tasks completed
              </span>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Tasks completed"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completion}
              >
                <div style={{ width: `${completion}%` }} />
              </div>
              <strong>{completion}%</strong>
              <span className="progress-caption">Progress, at your pace.</span>
            </footer>
          )}
        </main>
      </div>
      <Outlet />
    </div>
  );
}
function TaskCard({ task, list = false }: { task: Task; list?: boolean }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className={`task-card ${list ? 'list-card' : ''} ${task.status === 'COMPLETED' ? 'done' : ''}`}
      aria-label={`Open task: ${task.title}`}
    >
      <div className="card-top">
        <span className={`priority-badge ${task.priority}`}>
          <span />
          {priorityLabels[task.priority]} priority
        </span>
        <span className="task-number">#{String(task.id).padStart(3, '0')}</span>
      </div>
      <div className="card-copy">
        <h3>
          {task.status === 'COMPLETED' && <CircleCheck size={17} />}
          {task.title}
        </h3>
        {task.description && <p>{task.description}</p>}
      </div>
      <div className="card-footer">
        <span className={`due-label ${isOverdue(task) ? 'overdue' : ''}`}>
          <CalendarDays size={14} />
          {task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}
          {isOverdue(task) && <span className="overdue-text"> · Overdue</span>}
        </span>
        {list ? (
          <span className={`list-status ${task.status}`}>
            <span className={`status-dot ${task.status}`} />
            {statusLabels[task.status]}
          </span>
        ) : task.status === 'COMPLETED' ? (
          <Check size={16} />
        ) : (
          <Circle size={15} />
        )}
      </div>
    </Link>
  );
}
