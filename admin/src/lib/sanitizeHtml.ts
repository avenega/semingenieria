/** Sanitiza HTML del CMS: solo formato básico (sin scripts/eventos). */

const ALLOWED_TAGS = new Set([
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'BR',
  'P',
  'UL',
  'OL',
  'LI',
  'A',
  'SPAN',
]);

function escapeHtml(str: string): string {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str).replaceAll("'", '&#39;');
}

/** Enlaces seguros: http(s), mailto, tel o ruta relativa (no protocol-relative //). */
export function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (!h) return false;
  if (h.startsWith('//') || h.startsWith('\\\\')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) {
    return /^(https?:|mailto:|tel:)/i.test(h);
  }
  return h.startsWith('/') && !h.startsWith('//');
}

export function sanitizeCmsHtml(raw: string): string {
  const input = String(raw ?? '');
  if (!/[<>]/.test(input)) return escapeHtml(input);

  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return escapeHtml(input);

  function walk(node: ChildNode): string {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName;
    if (!ALLOWED_TAGS.has(tag)) {
      return Array.from(el.childNodes).map(walk).join('');
    }

    if (tag === 'BR') return '<br>';

    if (tag === 'A') {
      const href = (el.getAttribute('href') || '').trim();
      const inner = Array.from(el.childNodes).map(walk).join('');
      if (!isSafeHref(href)) return inner;
      return `<a href="${escapeAttr(href)}" rel="noopener noreferrer">${inner}</a>`;
    }

    const inner = Array.from(el.childNodes).map(walk).join('');
    if (tag === 'SPAN') return inner;
    return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
  }

  return Array.from(root.childNodes).map(walk).join('');
}
