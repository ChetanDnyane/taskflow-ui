import type { ApiError } from '../types';

// #region Translate Spring JSON errors and transport errors for forms
// Validation errors include fieldErrors, while proxy/network failures may not have
// JSON at all. Never render server HTML or stringify arbitrary error objects.
// #endregion
export function apiError(error: unknown): ApiError {
  if (error && typeof error === 'object' && 'status' in error) {
    if (
      'data' in error &&
      error.data &&
      typeof error.data === 'object' &&
      'message' in error.data
    ) {
      const data = error.data as ApiError;
      if (typeof data.message === 'string') return data;
    }
    if (error.status === 401) return { message: 'Your session has ended. Please sign in again.' };
    if (error.status === 403) return { message: 'You do not have permission to do that.' };
    if (error.status === 404) return { message: 'This task is no longer available.' };
    if (typeof error.status === 'number' && error.status >= 500)
      return { message: 'TaskFlow is temporarily unavailable. Please try again.' };
  }
  return { message: 'Could not connect to TaskFlow. Check your connection and try again.' };
}
