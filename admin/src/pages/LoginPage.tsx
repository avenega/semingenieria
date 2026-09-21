import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { PasswordField } from '../components/PasswordField';

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (ready && user) return <Navigate to="/inicio" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/inicio', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="login-brand-mark" aria-hidden="true">
            <i className="fa-solid fa-bolt" />
          </div>
          <div>
            <h1>SEM CMS</h1>
            <p>Panel de administración</p>
          </div>
        </div>
        <p className="login-lead">Ingresá con tu cuenta para gestionar el contenido del sitio.</p>
        {error && (
          <div className="alert alert-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" />
            <span>{error}</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            onInvalid={(e) =>
              (e.target as HTMLInputElement).setCustomValidity('Ingresá tu usuario')
            }
            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
          />
        </div>
        <PasswordField
          id="password"
          label="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          onInvalid={(e) =>
            (e.target as HTMLInputElement).setCustomValidity('Ingresá tu contraseña')
          }
          onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
        />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin" /> Entrando…
            </>
          ) : (
            <>
              <i className="fa-solid fa-right-to-bracket" /> Ingresar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
