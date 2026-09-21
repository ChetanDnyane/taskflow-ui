# TaskFlow UI

A complete React + TypeScript frontend for the Spring Boot application in the
sibling `../taskflow/` directory. Redux Toolkit holds authentication state; RTK Query handles
API requests, loading/error state, caching and task-list refreshes.

## Run locally

Requirements: Node.js 22.12+ (or a newer supported LTS), npm, and the existing
Spring Boot backend running on port **8080**. The backend still needs its usual
PostgreSQL database, `DB_PASSWORD` and `JWT_SECRET` environment variables.

From this directory:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open **http://127.0.0.1:5173**. Register an account, sign in, and create your first
task. The UI starts empty and uses real backend data; it contains no demo accounts
or mock tasks. A connection error means the backend is unavailable, not that your
task list is empty.

Vite forwards `/api/*` to `http://127.0.0.1:8080` without rewriting the path.
Set `API_PROXY_TARGET` in `.env` if Spring runs elsewhere; restart Vite afterward.
This avoids browser cross-origin requests during development and requires no
change to the current Spring Security configuration.

## What works

- Registration, duplicate-email feedback, login and invalid-credential feedback.
- Protected workspace, per-tab session persistence, expiry handling and sign-out.
- Create, list, retrieve, update and delete tasks using all existing task endpoints.
- Title/description validation, priority, status and optional calendar due dates.
- Board/list layouts; all, today, upcoming and completed views; search, status and
  priority filters; newest, due-date and priority sorting.
- Real task counts, overdue indicators, completion progress and manual refresh.
- Loading, empty, missing-task, network and server-error states.
- Responsive navigation, keyboard-accessible controls, native modal focus handling
  and explicit deletion confirmation.

The backend has no profile, password-reset, refresh-token, server logout or admin
business endpoints. The UI does not present controls for those nonexistent flows.
The account label uses the JWT email because login only returns a token.

## Architecture and reading order

<details>
<summary>Follow login from a form into Spring Security</summary>

1. `features/auth/AuthPage.tsx` submits email/password with the login mutation.
2. `services/api.ts` sends the public request without a bearer header. The backend
   checks the password and returns a JWT.
3. `lib/session.ts` reads email and expiration for display and local expiry only.
   It does **not** verify the signature; that remains Spring's responsibility.
4. `authSlice.ts` stores the session. Store listener middleware persists the token
   in `sessionStorage`, so a refresh in the same tab retains the session.
5. RTK Query attaches `Authorization: Bearer ...` to task requests. Spring verifies
   it and applies ownership checks. Protected 401 responses clear the session and
   all cached tasks and return the user to login.

Passwords are never persisted. Browser storage is accessible to JavaScript, so
avoiding XSS remains important. Sign-out removes this tab's credential and cache;
it cannot revoke an already copied JWT because the backend has no revocation API.
No signing secret belongs in a `VITE_*` variable or frontend file.

</details>

<details>
<summary>Follow a task change through the Redux cache</summary>

`Workspace.tsx` subscribes to `getTasks`. The result is stored in RTK Query rather
than duplicated in a separate task slice. Task selection, search and sort derive
displayed results without modifying the server response.

Opening a task navigates to `/tasks/:id` and fetches `GET /api/tasks/{id}`.
The editor sends every editable field for PUT, including null description/date
when cleared. Creation leaves initial status to the backend's TODO default.
Successful mutations close the editor; invalidated task queries refresh the list.
Failed writes retain the form input and display the server error.

Due dates are calendar strings, so local display avoids interpreting midnight as
UTC. Created/updated values are instants and use the browser's local date/time.
Today/upcoming exclude completed tasks; overdue means an unfinished task with a
due date before today. All filtering happens locally because the backend returns
an unpaginated list and does not expose filtering parameters.

</details>

<details>
<summary>Files and foldable explanations</summary>

Source files use `// #region` / `// #endregion` explanation blocks supported by
VS Code and many TypeScript editors. CSS uses labeled multiline comments.
JSON files cannot contain comments, so their purpose is documented here.

| File or directory                    | Responsibility                                                   |
| ------------------------------------ | ---------------------------------------------------------------- |
| `src/main.tsx`                       | React entry point, global providers and rendering error boundary |
| `src/app/App.tsx`                    | Routes, authentication guard and session-expiry timer            |
| `src/app/store.ts`                   | Redux reducers, typed hooks, storage/cache lifecycle             |
| `src/features/auth/`                 | Login/register UI and authentication slice                       |
| `src/features/tasks/`                | Workspace, board/list, details and task editor                   |
| `src/services/api.ts`                | Typed endpoint definitions, bearer headers and 401 handling      |
| `src/types.ts`                       | Spring request/response and enum contracts                       |
| `src/lib/`                           | Session metadata, errors, dates, filters and focused tests       |
| `src/components/`                    | Shared branding, feedback and accessible modal                   |
| `src/styles.css`                     | Visual tokens, layouts and responsive breakpoints                |
| `vite.config.ts`                     | React compilation and local API proxy                            |
| `tsconfig.json`                      | Strict TypeScript checking with no compiler output               |
| `package.json` / `package-lock.json` | Scripts, dependencies and reproducible resolution                |
| `index.html` / `public/favicon.svg`  | App document and local product icon                              |
| `.env.example` / `.gitignore`        | Configuration template and local/generated exclusions            |
| `playwright.config.ts` / `tests/`    | Real-backend browser workflow tests                              |

</details>

## Validate

```powershell
npm run build       # strict TypeScript check + production bundle
npm test            # date/filter/session regression cases
npm run format:check # verify consistent source formatting
```

Browser tests use a **separate, disposable backend** on port 18080. From the
backend directory, run the application with the test classpath/profile:

```powershell
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.useTestClasspath=true' '-Dspring-boot.run.profiles=test' '-Dspring-boot.run.arguments=--server.port=18080'
```

This uses the existing H2 test settings, not the development PostgreSQL database.
The database disappears when the process ends. Tests create unique accounts and
exercise actual HTTP requests; they do not mock the API. In a second terminal:

```powershell
cd ..\taskflow-ui
npx playwright install chromium
npm run test:e2e
```

Playwright starts Vite with its API target set to port 18080. Stop an existing Vite
server first if it targets a different backend. Alternatively, set
`PLAYWRIGHT_EXECUTABLE_PATH` to an installed Chromium-based browser executable.
You can override `API_PROXY_TARGET` for another **disposable** test backend.

Verified on September 21, 2026: production build, formatting check, **7 unit tests**
and **3 browser scenarios** passed. The browser checks covered real Spring/H2
registration and login, full task CRUD, clearing optional fields, reload persistence,
duplicate/invalid credentials, account isolation, forged-token rejection, filters,
mobile width, keyboard dismissal and recovery after a failed offline save. Desktop,
mobile, login and editor screenshots were also reviewed with no browser runtime errors.

The dependency lockfile is part of the project source; `node_modules`, build output and test
reports are ignored. Run `npm run format` after edits. Formatter options live in
`.prettierrc.json`, and `.prettierignore` excludes generated artifacts.

## Production connection

Run `npm run build` and serve `dist/` with a static web server. Configure:

1. `/api/*` proxying to Spring Boot, forwarding the path and Authorization header.
2. An `index.html` fallback for frontend routes such as `/tasks/123` and `/login`.
3. HTTPS for the public origin.

The development proxy is not included in compiled static files. A reference
reverse-proxy configuration is in `deploy/nginx.conf`. Replace its backend host
for your environment and configure TLS at your proxy/load balancer.

Changing `VITE_API_BASE_URL` to a different origin is possible but also requires an
explicit backend CORS policy. Same-origin `/api` deployment works with the existing
backend. No hosting service or database settings have been changed by this project.

Reference documentation: [RTK Query](https://redux-toolkit.js.org/rtk-query/overview)
and [Vite proxy options](https://vite.dev/config/server-options#server-proxy).
