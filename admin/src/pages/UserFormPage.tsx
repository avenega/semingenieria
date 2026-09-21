import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, type CmsUser, type UserRole } from '../api';
import { useAuth } from '../auth';
import { PasswordField } from '../components/PasswordField';
import { useFlash } from '../flash';

type Mode = 'create' | 'edit';

export function UserFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { setMsg, setErr } = useFlash();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [target, setTarget] = useState<CmsUser | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !id || me?.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api<{ user: CmsUser }>(`/api/admin/users/${id}`);
        if (cancelled) return;
        setTarget(data.user);
        setUsername(data.user.username);
        setRole(data.user.role);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Usuario no encontrado');
          navigate('/usuarios', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id, me?.role, navigate, setErr]);

  if (me?.role !== 'admin') return <Navigate to="/inicio" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (password && password !== password2) {
      setErr('Las contraseñas no coinciden');
      return;
    }

    if (mode === 'create' && password.length < 8) {
      setErr('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (mode === 'edit' && password && password.length < 8) {
      setErr('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await api('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({ username, password, role }),
        });
        setMsg(`Usuario “${username.trim().toLowerCase()}” creado`);
        navigate('/usuarios');
      } else if (id) {
        const body: { role?: UserRole; password?: string } = { role };
        if (password) body.password = password;
        await api(`/api/admin/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setMsg(
          password && id === me.id
            ? 'Usuario actualizado (otras sesiones cerradas)'
            : 'Usuario actualizado',
        );
        navigate('/usuarios');
      }
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-body">
          <p className="muted">Cargando usuario…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="crumb">
            <Link to="/usuarios">Usuarios</Link>
            <span>/</span>
            <span>{mode === 'create' ? 'Nuevo' : username}</span>
          </div>
          <h3>{mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</h3>
          <p className="muted">
            {mode === 'create'
              ? 'Creá una cuenta con rol admin o editor.'
              : 'Actualizá rol o contraseña. El nombre de usuario no se puede cambiar.'}
          </p>
        </div>
        <Link className="btn btn-ghost btn-sm" to="/usuarios">
          <i className="fa-solid fa-arrow-left" />
          Volver al listado
        </Link>
      </div>

      <form onSubmit={onSubmit}>
        <div className="panel-body form-grid">
          <div className="field">
            <label htmlFor="user-username">Usuario</label>
            <input
              id="user-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. maria"
              autoComplete="off"
              required={mode === 'create'}
              disabled={mode === 'edit'}
            />
            {mode === 'create' && (
              <span className="field-hint">3–32 caracteres: a-z, 0-9, . _ -</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="user-role">Rol</label>
            <select
              id="user-role"
              value={role}
              disabled={mode === 'edit' && target?.id === me.id}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="editor">Editor — solo contenido</option>
              <option value="admin">Administrador — contenido + usuarios</option>
            </select>
            {mode === 'edit' && target?.id === me.id && (
              <span className="field-hint">No podés cambiar tu propio rol desde aquí.</span>
            )}
          </div>

          <PasswordField
            id="user-password"
            label={mode === 'create' ? 'Contraseña' : 'Nueva contraseña'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required={mode === 'create'}
            placeholder={mode === 'edit' ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
          />

          <PasswordField
            id="user-password2"
            label="Confirmar contraseña"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            compareWith={password}
            required={mode === 'create' || Boolean(password)}
            placeholder="Repetí la contraseña"
          />
        </div>

        <div className="panel-foot">
          <Link className="btn btn-ghost" to="/usuarios">
            Cancelar
          </Link>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={
              saving ||
              (mode === 'create' && (password.length < 8 || password !== password2)) ||
              (mode === 'edit' && Boolean(password) && password !== password2)
            }
          >
            {saving ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" /> Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" />
                {mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
