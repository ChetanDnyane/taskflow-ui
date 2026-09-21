// #region Wire contracts copied from the Spring request/response records
// Dates stay ISO strings across JSON. dueDate is a date without timezone, while
// createdAt/updatedAt are timestamps. Updates send all editable fields (PUT).
// #endregion
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateTaskRequest {
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string | null;
}
export interface UpdateTaskRequest extends CreateTaskRequest {
  status: TaskStatus;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface RegisterRequest extends LoginRequest {
  name: string;
}
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}
export interface ApiError {
  error?: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
export const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
export const priorities: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW'];
export const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};
export const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};
