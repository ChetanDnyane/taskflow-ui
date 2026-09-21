import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Layers3 } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { ErrorNotice } from '../../components/Feedback';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { useLoginMutation, useRegisterMutation } from '../../services/api';
import { apiError } from '../../lib/errors';
import { sessionFromToken } from '../../lib/session';
import { signedIn } from './authSlice';
import type { ApiError } from '../../types';

// #region Public forms mirror Spring constraints and keep passwords in local form state
// Registration creates an account but does not issue a token, so success navigates
// to login with an explicit confirmation. Login decodes JWT display/expiry metadata;
// all actual authorization remains on the server. Server field errors stay visible.
// #endregion
export function AuthPage({ register = false }: { register?: boolean }) {
  const session = useAppSelector((state) => state.auth.session);
  const reason = useAppSelector((state) => state.auth.reason);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const registeredEmail = (location.state as { registeredEmail?: string } | null)?.registeredEmail;
  const [email, setEmail] = useState(registeredEmail || '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [login, loginState] = useLoginMutation();
  const [registerUser, registerState] = useRegisterMutation();
  const busy = loginState.isLoading || registerState.isLoading;
  if (session) return <Navigate to="/tasks" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (register && !name.trim()) {
      setError({ message: 'Please enter your name.', fieldErrors: { name: 'Name is required' } });
      return;
    }
    try {
      if (register) {
        await registerUser({ name: name.trim(), email: normalizedEmail, password }).unwrap();
        navigate('/login', { replace: true, state: { registeredEmail: normalizedEmail } });
      } else {
        const response = await login({ email: normalizedEmail, password }).unwrap();
        const next = sessionFromToken(response.token);
        if (!next) {
          setError({
            message: 'The server returned an unusable session. Please try signing in again.',
          });
          return;
        }
        dispatch(signedIn(next));
        navigate('/tasks', { replace: true });
      }
    } catch (failure) {
      setError(apiError(failure));
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="story-content">
          <span className="story-tag">
            <Layers3 size={16} /> A little structure. A lot of possibility.
          </span>
          <h1>
            Make room for
            <br />
            your next
            <br />
            <em>big thing.</em>
          </h1>
          <p>A clear view of what matters, and a little momentum to get you there.</p>
          <div className="story-checks">
            <span>
              <Check size={17} /> Keep your priorities in sight
            </span>
            <span>
              <Check size={17} /> Turn plans into progress
            </span>
            <span>
              <Check size={17} /> A workspace that’s only yours
            </span>
          </div>
        </div>
        <div className="story-footer">
          ONE TASK AT A TIME.<span>TaskFlow / Personal workspace</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">LET’S GET INTO FLOW</span>
          <h2>{register ? 'Start your workspace.' : 'Welcome back.'}</h2>
          <p className="muted">
            {register
              ? 'A fresh start for everything you want to do.'
              : 'Your plans are right where you left them.'}
          </p>
          {registeredEmail && !register && (
            <div className="notice success" role="status">
              Account created. Sign in to start planning.
            </div>
          )}
          {reason && !register && (
            <div className="notice" role="status">
              {reason}
            </div>
          )}
          {error && <ErrorNotice message={error.message} />}
          <form onSubmit={submit} className="form-stack">
            {register && (
              <label htmlFor="name">
                <span id="name-label">Your name</span>
                <input
                  id="name"
                  aria-labelledby="name-label"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={busy}
                  aria-invalid={!!error?.fieldErrors?.name}
                  aria-describedby={error?.fieldErrors?.name ? 'name-error' : undefined}
                  placeholder="What should we call you?"
                />
                {error?.fieldErrors?.name && (
                  <span className="field-error" id="name-error">
                    {error.fieldErrors.name}
                  </span>
                )}
              </label>
            )}
            <label htmlFor="email">
              <span id="email-label">Email address</span>
              <input
                id="email"
                aria-labelledby="email-label"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                disabled={busy}
                placeholder="you@example.com"
                aria-invalid={!!error?.fieldErrors?.email}
                aria-describedby={error?.fieldErrors?.email ? 'email-error' : undefined}
              />
              {error?.fieldErrors?.email && (
                <span className="field-error" id="email-error">
                  {error.fieldErrors.email}
                </span>
              )}
            </label>
            <label htmlFor="password">
              <span id="password-label">Password</span>
              <div className="password-wrap">
                <input
                  aria-labelledby="password-label"
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={register ? 8 : undefined}
                  maxLength={register ? 72 : undefined}
                  required
                  disabled={busy}
                  placeholder={register ? 'Choose a strong password' : 'Enter your password'}
                  aria-invalid={!!error?.fieldErrors?.password}
                  aria-describedby={
                    [
                      register ? 'password-hint' : '',
                      error?.fieldErrors?.password ? 'password-error' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {register && (
                <span className="field-hint" id="password-hint">
                  Use 8–72 characters.
                </span>
              )}
              {error?.fieldErrors?.password && (
                <span className="field-error" id="password-error">
                  {error.fieldErrors.password}
                </span>
              )}
            </label>
            <button className="button primary auth-submit" disabled={busy}>
              {busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to TaskFlow?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
        <p className="auth-bottom">Less scattered. More accomplished.</p>
      </section>
    </main>
  );
}
