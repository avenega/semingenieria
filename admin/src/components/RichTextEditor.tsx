import { useEffect, useId, useRef } from 'react';
import { sanitizeCmsHtml } from '../lib/sanitizeHtml';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  hint?: string;
};

function normalizeHtml(html: string): string {
  return sanitizeCmsHtml(
    html
      .replace(/<div><br><\/div>/gi, '<br>')
      .replace(/<div>/gi, '<br>')
      .replace(/<\/div>/gi, '')
      .replace(/^(<br\s*\/?>)+/i, '')
      .replace(/(<br\s*\/?>)+$/i, '')
      .trim(),
  );
}

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  minHeight = 110,
  hint,
}: Props) {
  const autoId = useId();
  const fieldId = id || autoId;
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = sanitizeCmsHtml(value || '');
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value]);

  function run(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  function emit() {
    const el = ref.current;
    if (!el) return;
    const html = normalizeHtml(el.innerHTML);
    if (html === lastEmitted.current) return;
    lastEmitted.current = html;
    onChange(html);
  }

  return (
    <div className="field rich-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="rich-toolbar" role="toolbar" aria-label={`Formato: ${label}`}>
        <button type="button" className="rich-btn" title="Negrita" onClick={() => run('bold')}>
          <i className="fa-solid fa-bold" />
        </button>
        <button type="button" className="rich-btn" title="Cursiva" onClick={() => run('italic')}>
          <i className="fa-solid fa-italic" />
        </button>
        <button
          type="button"
          className="rich-btn"
          title="Subrayado"
          onClick={() => run('underline')}
        >
          <i className="fa-solid fa-underline" />
        </button>
        <span className="rich-sep" />
        <button
          type="button"
          className="rich-btn"
          title="Lista"
          onClick={() => run('insertUnorderedList')}
        >
          <i className="fa-solid fa-list-ul" />
        </button>
        <button
          type="button"
          className="rich-btn"
          title="Quitar formato"
          onClick={() => run('removeFormat')}
        >
          <i className="fa-solid fa-eraser" />
        </button>
      </div>
      <div
        id={fieldId}
        ref={ref}
        className="rich-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder="Escribí el texto…"
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        suppressContentEditableWarning
      />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
