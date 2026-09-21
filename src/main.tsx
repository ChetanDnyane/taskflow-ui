import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { store } from './app/store';
import './styles.css';

// #region Compose global providers once; catch unexpected rendering failures
// BrowserRouter needs a production SPA fallback. The Redux provider exposes both
// auth state and RTK Query cache. StrictMode helps surface effect cleanup mistakes.
// #endregion
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>Let’s try that again.</h1>
        <p>Something interrupted your workspace. Reload to reconnect.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Reload TaskFlow
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
);
