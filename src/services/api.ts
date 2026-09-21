import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { signedOut, type AuthState } from '../features/auth/authSlice';
import type {
  CreateTaskRequest,
  LoginRequest,
  RegisterRequest,
  Task,
  UpdateTaskRequest,
  UserResponse,
} from '../types';

// #region RTK Query owns server data, request state and cache invalidation
// Public auth calls never attach a stale bearer token: the backend JWT filter would
// reject it even on permitAll routes. On a protected 401, sign out only if the failed
// request belongs to the current session, avoiding an old request ending a new login.
// There is no refresh endpoint. Cache is reset on sign-out by store middleware.
// #endregion
const publicEndpoints = new Set(['login', 'register']);
const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  prepareHeaders(headers, { getState, endpoint }) {
    const session = (getState() as { auth: AuthState }).auth.session;
    if (session && !publicEndpoints.has(endpoint))
      headers.set('Authorization', `Bearer ${session.token}`);
    return headers;
  },
});
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra,
) => {
  const token = (api.getState() as { auth: AuthState }).auth.session?.token;
  const result = await rawBaseQuery(args, api, extra);
  if (
    result.error?.status === 401 &&
    !publicEndpoints.has(api.endpoint) &&
    token === (api.getState() as { auth: AuthState }).auth.session?.token
  ) {
    api.dispatch(signedOut('Your session has ended. Please sign in again.'));
  }
  return result;
};
export const taskflowApi = createApi({
  reducerPath: 'taskflowApi',
  baseQuery,
  tagTypes: ['Task'],
  endpoints: (build) => ({
    login: build.mutation<{ token: string }, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: build.mutation<UserResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    getTasks: build.query<Task[], void>({ query: () => '/tasks', providesTags: ['Task'] }),
    getTask: build.query<Task, number>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    createTask: build.mutation<Task, CreateTaskRequest>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
    updateTask: build.mutation<Task, { id: number; body: UpdateTaskRequest }>({
      query: ({ id, body }) => ({ url: `/tasks/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Task'],
    }),
    deleteTask: build.mutation<void, number>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Task'],
    }),
  }),
});
export const {
  useLoginMutation,
  useRegisterMutation,
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = taskflowApi;
