import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, type CmsUser } from '../api';
import { useAuth } from '../auth';
import { useFlash } from '../flash';

export function UsersListPage() {
  const { user } = useAuth();
  const { setMsg, setErr } = useFlash();
  const navigate = useNavigate();
  const [items, setItems] = useState<CmsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ items: CmsUser[] }>('/api/admin/users');
      setItems(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role !== 'admin') return;
    void load();
  }, [user?.role]);

  if (user?.role !== 'admin') return <Navigate to="/inicio" replace />;

  async function onDelete(u: CmsUser) {
    if (!confirm(`¿Eliminar el usuario “${u.username}”? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(u.id);
    setErr('');
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      setMsg(`Usuario “${u.username}” eliminado`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Usuarios</h3>
          <p className="muted">Alta, edición y baja de cuentas del CMS.</p>
        </div>
        <Link className="btn btn-primary btn-sm" to="/usuarios/nuevo">
          <i className="fa-solid fa-user-plus" />
          Nuevo usuario
        </Link>
      </div>

      <div className="panel-body">
        {loading ? (
          <p className="muted">Cargando usuarios…</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-users" />
            <p>No hay usuarios cargados.</p>
            <Link className="btn btn-primary btn-sm" to="/usuarios/nuevo">
              Crear el primero
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                  <th className="col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="sidebar-avatar">{u.username.slice(0, 1)}</div>
                        <div>
                          <strong>{u.username}</strong>
                          {u.id === user.id && (
                            <div className="muted" style={{ fontSize: '0.75rem' }}>
                              Vos
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-editor'}`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Editor'}
                      </span>
                    </td>
                    <td className="muted">
                      {new Date(u.created_at).toLocaleString('es-PY')}
                    </td>
                    <td className="muted">
                      {new Date(u.updated_at).toLocaleString('es-PY')}
                    </td>
                    <td className="col-actions">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/usuarios/${u.id}/editar`)}
                        >
                          <i className="fa-solid fa-pen" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={u.id === user.id || deletingId === u.id}
                          title={
                            u.id === user.id
                              ? 'No podés eliminar tu propio usuario'
                              : 'Eliminar'
                          }
                          onClick={() => void onDelete(u)}
                        >
                          <i className="fa-solid fa-trash" />
                          {deletingId === u.id ? '…' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
