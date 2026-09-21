import { useState, type FormEvent } from 'react';
import { ArrowLeft, CalendarDays, Check, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { ErrorNotice, Loading } from '../../components/Feedback';
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetTaskQuery,
  useUpdateTaskMutation,
} from '../../services/api';
import { apiError } from '../../lib/errors';
import {
  priorities,
  priorityLabels,
  statuses,
  statusLabels,
  type ApiError,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../../types';

// #region A task editor uses the item endpoint, not an assumed list-cache snapshot
// New tasks inherit TODO on the backend. Existing tasks send a complete PUT body,
// with empty optional inputs represented as null so clearing fields is explicit.
// A failed write keeps user input. Delete requires a separate confirmation step.
// #endregion
export function TaskDetailRoute() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const valid = /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const { data, isLoading, error, refetch } = useGetTaskQuery(Number(id), { skip: !valid });
  const close = () => navigate('/tasks');
  if (!valid || error)
    return (
      <Modal title="Task unavailable" onClose={close}>
        <div className="modal-body">
          <ErrorNotice message={!valid ? 'This task link is invalid.' : apiError(error).message} />
          {valid && (
            <button className="button secondary" onClick={() => void refetch()}>
              Try again
            </button>
          )}
        </div>
      </Modal>
    );
  if (isLoading || !data)
    return (
      <Modal title="Task details" onClose={close}>
        <Loading label="Opening your task…" />
      </Modal>
    );
  return <TaskEditor key={data.id} task={data} onClose={close} />;
}
export function NewTaskRoute() {
  const navigate = useNavigate();
  return <TaskEditor onClose={() => navigate('/tasks')} />;
}
function TaskEditor({ task, onClose }: { task?: Task; onClose: () => void }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'TODO');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [error, setError] = useState<ApiError | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [create, creation] = useCreateTaskMutation();
  const [update, updating] = useUpdateTaskMutation();
  const [remove, deleting] = useDeleteTaskMutation();
  const busy = creation.isLoading || updating.isLoading || deleting.isLoading;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError({ message: 'Give your task a title.', fieldErrors: { title: 'Title is required' } });
      return;
    }
    const body = {
      title: title.trim(),
      description: description || null,
      priority,
      dueDate: dueDate || null,
    };
    try {
      if (task) await update({ id: task.id, body: { ...body, status } }).unwrap();
      else await create(body).unwrap();
      onClose();
    } catch (failure) {
      setError(apiError(failure));
    }
  }
  async function deleteTask() {
    if (!task) return;
    setError(null);
    try {
      await remove(task.id).unwrap();
      onClose();
    } catch (failure) {
      setError(apiError(failure));
    }
  }
  return (
    <Modal
      title={confirmDelete ? 'Delete this task?' : task ? 'Task details' : 'A new thing to do.'}
      subtitle={
        confirmDelete
          ? 'This permanently removes the task from your workspace.'
          : task
            ? `TASK-${String(task.id).padStart(3, '0')}`
            : 'Make it specific. Make it happen.'
      }
      onClose={onClose}
      busy={busy}
    >
      {confirmDelete ? (
        <div className="modal-body">
          <p className="delete-title">{title}</p>
          {error && <ErrorNotice message={error.message} />}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(false);
                setError(null);
              }}
            >
              Keep task
            </button>
            <button className="button danger" disabled={busy} onClick={() => void deleteTask()}>
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="modal-body form-stack">
            {error && <ErrorNotice message={error.message} />}
            <label htmlFor="task-title">
              <span id="task-title-label">Task title</span>
              <input
                autoFocus
                id="task-title"
                aria-labelledby="task-title-label"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                disabled={busy}
                placeholder="What would you like to get done?"
                aria-invalid={!!error?.fieldErrors?.title}
                aria-describedby={error?.fieldErrors?.title ? 'title-error' : undefined}
              />
              {error?.fieldErrors?.title && (
                <span className="field-error" id="title-error">
                  {error.fieldErrors.title}
                </span>
              )}
            </label>
            <label htmlFor="description">
              <span id="description-label">
                Description <span className="optional">optional</span>
              </span>
              <textarea
                id="description"
                aria-labelledby="description-label"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                disabled={busy}
                placeholder="Add a little context, a plan, or a reminder…"
                aria-describedby={error?.fieldErrors?.description ? 'description-error' : undefined}
              />
              {error?.fieldErrors?.description && (
                <span className="field-error" id="description-error">
                  {error.fieldErrors.description}
                </span>
              )}
            </label>
            <div className="form-grid">
              <label htmlFor="priority">
                <span id="priority-label">Priority</span>
                <select
                  id="priority"
                  aria-labelledby="priority-label"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={busy}
                >
                  {priorities.map((value) => (
                    <option key={value} value={value}>
                      {priorityLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="due-date">
                <span id="due-date-label">
                  Due date <span className="optional">optional</span>
                </span>
                <input
                  id="due-date"
                  aria-labelledby="due-date-label"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  max="9999-12-31"
                  disabled={busy}
                />
              </label>
            </div>
            {task && (
              <label htmlFor="status">
                <span id="status-label">Status</span>
                <select
                  id="status"
                  aria-labelledby="status-label"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={busy}
                >
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {statusLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {task && (
              <div className="task-timestamps">
                <CalendarDays size={14} />
                <span>
                  Created {new Date(task.createdAt).toLocaleString()}
                  <br />
                  Updated {new Date(task.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {task ? (
              <button
                type="button"
                className="button text-danger"
                disabled={busy}
                onClick={() => {
                  setConfirmDelete(true);
                  setError(null);
                }}
              >
                <Trash2 size={17} />
                Delete task
              </button>
            ) : (
              <span className="field-hint">
                <span className="status-dot TODO" /> Starts in To do
              </span>
            )}
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
                <ArrowLeft size={16} />
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                <Check size={17} />
                {busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
