import { describe, expect, it } from 'vitest';
import { isOverdue, selectTasks, todayISO, type Filters } from './tasks';
import { sessionFromToken } from './session';
import type { Task } from '../types';

// #region Regression cases for business semantics the UI derives locally
// These verify date boundaries, completed-task exclusion and defensive session parsing.
// Browser integration tests exercise the real Spring API rather than mocking its contracts.
// #endregion
const makeTask = (id: number, extra: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...extra,
});
const filters: Filters = { view: 'all', search: '', status: '', priority: '', sort: 'newest' };
describe('task views', () => {
  it('treats today as a local calendar date', () => {
    expect(todayISO(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02');
  });
  it('does not mark completed tasks or today as overdue', () => {
    expect(isOverdue(makeTask(1, { dueDate: '2026-01-01' }), '2026-01-02')).toBe(true);
    expect(isOverdue(makeTask(1, { dueDate: '2026-01-02' }), '2026-01-02')).toBe(false);
    expect(
      isOverdue(makeTask(1, { dueDate: '2026-01-01', status: 'COMPLETED' }), '2026-01-02'),
    ).toBe(false);
  });
  it('keeps completed and undated work out of upcoming', () => {
    const tasks = [
      makeTask(1),
      makeTask(2, { dueDate: '2026-01-03' }),
      makeTask(3, { dueDate: '2026-01-03', status: 'COMPLETED' }),
    ];
    expect(
      selectTasks(tasks, { ...filters, view: 'upcoming' }, '2026-01-02').map((t) => t.id),
    ).toEqual([2]);
  });
  it('combines search and priority without mutating source order', () => {
    const tasks = [
      makeTask(1, { description: 'Read Spring docs', priority: 'HIGH' }),
      makeTask(2, { title: 'Spring notes' }),
    ];
    expect(
      selectTasks(tasks, { ...filters, search: ' SPRING ', priority: 'HIGH' }).map((t) => t.id),
    ).toEqual([1]);
    expect(tasks.map((t) => t.id)).toEqual([1, 2]);
  });
  it('sorts undated tasks after tasks with due dates', () => {
    expect(
      selectTasks([makeTask(1), makeTask(2, { dueDate: '2026-01-03' })], {
        ...filters,
        sort: 'due',
      }).map((t) => t.id),
    ).toEqual([2, 1]);
  });
});
describe('session metadata', () => {
  const token = (payload: object) => `header.${btoa(JSON.stringify(payload))}.signature`;
  it('rejects malformed, expired and missing-expiry payloads', () => {
    expect(sessionFromToken('invalid')).toBeNull();
    expect(sessionFromToken(token({ sub: 'a@example.com', exp: 1 }))).toBeNull();
    expect(sessionFromToken(token({ sub: 'a@example.com' }))).toBeNull();
  });
  it('reads metadata while leaving signature verification to the server', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(sessionFromToken(token({ sub: 'a@example.com', exp }))).toMatchObject({
      email: 'a@example.com',
      expiresAt: exp * 1000,
    });
  });
});
