import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api, type AuthUser } from '../api';
import { useAuth } from '../auth';
import { useFlash } from '../flash';
import { PasswordField } from './PasswordField';

export function ProfileMenu({ user }: { user: AuthUser }) {
  const { logout } = useAuth();
  const { setMsg, setErr } = useFlash();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function onLogout() {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <div className="profile-menu" ref={rootRef}>
        <button
          type="button"
          className={`profile-trigger ${open ? 'is-open' : ''}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sidebar-avatar profile-trigger-avatar">
            {user.username.slice(0, 1)}
          </span>
          <span className="profile-trigger-meta">
            <strong>{user.username}</strong>
            <span>{user.role === 'admin' ? 'Administrador' : 'Editor'}</span>
          </span>
          <i className="fa-solid fa-chevron-down profile-caret" aria-hidden="true" />
        </button>

        {open && (
          <div className="profile-dropdown" role="menu">
            <div className="profile-dropdown-head">
              <div className="sidebar-avatar">{user.username.slice(0, 1)}</div>
              <div>
                <strong>{user.username}</strong>
                <div className="muted">
                  {user.role === 'admin' ? 'Administrador' : 'Editor'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="profile-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setModalOpen(true);
              }}
            >
              <i className="fa-solid fa-key" aria-hidden="true" />
              Cambiar contraseña
            </button>
            <button
              type="button"
              className="profile-item profile-item-danger"
              role="menuitem"
              onClick={() => void onLogout()}
            >
              <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {modalOpen &&
        createPortal(
          <PasswordModal
            onClose={() => setModalOpen(false)}
            onSaved={() => {
              setModalOpen(false);
              setMsg('Contraseña actualizada');
            }}
            onError={(msg) => setErr(msg)}
          />,
          document.body,
        )}
    </>
  );
}

function PasswordModal({
  onClose,
  onSaved,
  onError,
}: {
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function showError(msg: string) {
    setLocalError(msg);
    onError(msg);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');
    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      showError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSaving(true);
    try {
      await api('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      onSaved();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwd-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3 id="pwd-modal-title">Cambiar contraseña</h3>
            <p className="muted">Actualizá tu acceso al panel CMS.</p>
          </div>
          <button type="button" className="toast-close" aria-label="Cerrar" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {localError && (
              <div className="alert alert-error" role="alert">
                <i className="fa-solid fa-circle-exclamation" />
                <span>{localError}</span>
              </div>
            )}
            <PasswordField
              id="pwd-current"
              label="Contraseña actual"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
              onInvalid={(e) =>
                (e.target as HTMLInputElement).setCustomValidity(
                  'Ingresá tu contraseña actual',
                )
              }
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            />
            <PasswordField
              id="pwd-new"
              label="Nueva contraseña"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              onInvalid={(e) => {
                const el = e.target as HTMLInputElement;
                el.setCustomValidity(
                  el.validity.valueMissing
                    ? 'Ingresá la nueva contraseña'
                    : 'La contraseña debe tener al menos 8 caracteres',
                );
              }}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            />
            <PasswordField
              id="pwd-confirm"
              label="Confirmar nueva contraseña"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              compareWith={newPassword}
              required
              minLength={8}
              onInvalid={(e) => {
                const el = e.target as HTMLInputElement;
                el.setCustomValidity(
                  el.validity.valueMissing
                    ? 'Confirmá la nueva contraseña'
                    : 'La contraseña debe tener al menos 8 caracteres',
                );
              }}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            />
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                saving ||
                newPassword.length < 8 ||
                confirmPassword !== newPassword
              }
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" /> Guardando…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk" /> Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
