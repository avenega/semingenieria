import { useState, type InputHTMLAttributes } from 'react';

type MatchStatus = 'idle' | 'wait' | 'mismatch' | 'match';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  /** Si se pasa, este campo se compara en vivo con ese valor (confirmación). */
  compareWith?: string;
};

function matchStatus(value: string, compareWith?: string): MatchStatus {
  if (compareWith === undefined) return 'idle';
  if (!value) return 'idle';
  if (!compareWith) return 'wait';
  return value === compareWith ? 'match' : 'mismatch';
}

export function PasswordField({
  label,
  id,
  className,
  compareWith,
  ...inputProps
}: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id || inputProps.name || 'password';
  const value = String(inputProps.value ?? '');
  const status = matchStatus(value, compareWith);
  const showHint = compareWith !== undefined;

  return (
    <div className={`field ${className || ''}`.trim()}>
      <label htmlFor={inputId}>{label}</label>
      <div className="password-field">
        <input
          {...inputProps}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`password-field-input ${
            status === 'mismatch' ? 'is-mismatch' : status === 'match' ? 'is-match' : ''
          }`}
          aria-invalid={status === 'mismatch' || undefined}
          aria-describedby={showHint ? `${inputId}-match` : undefined}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
        >
          <i className={`fa-solid ${visible ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
        </button>
      </div>
      {showHint && (
        <div
          id={`${inputId}-match`}
          className={`pwd-match pwd-match-${status}`}
          role="status"
          aria-live="polite"
        >
          {status === 'idle' && (
            <>
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <span>Repetí la contraseña para confirmar</span>
            </>
          )}
          {status === 'wait' && (
            <>
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <span>Ingresá primero la contraseña nueva</span>
            </>
          )}
          {status === 'mismatch' && (
            <>
              <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
              <span>Las contraseñas no coinciden</span>
            </>
          )}
          {status === 'match' && (
            <>
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <span>Las contraseñas coinciden</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}
