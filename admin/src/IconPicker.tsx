import { useMemo, useState } from 'react';

const ICONS = [
  'fa-plug',
  'fa-bolt',
  'fa-bolt-lightning',
  'fa-industry',
  'fa-gears',
  'fa-gear',
  'fa-helmet-safety',
  'fa-fire-extinguisher',
  'fa-fire',
  'fa-shield-halved',
  'fa-video',
  'fa-camera',
  'fa-snowflake',
  'fa-temperature-low',
  'fa-wrench',
  'fa-screwdriver-wrench',
  'fa-toolbox',
  'fa-hard-hat',
  'fa-building',
  'fa-building-shield',
  'fa-warehouse',
  'fa-truck',
  'fa-ship',
  'fa-gas-pump',
  'fa-oil-can',
  'fa-mountain',
  'fa-mountain-rocks',
  'fa-wheat-awn',
  'fa-wheat-straw',
  'fa-box-open',
  'fa-boxes-stacked',
  'fa-cart-shopping',
  'fa-store',
  'fa-shirt',
  'fa-glasses',
  'fa-eye',
  'fa-handshake',
  'fa-users',
  'fa-user-gear',
  'fa-phone',
  'fa-envelope',
  'fa-clock',
  'fa-map-location-dot',
  'fa-earth-americas',
  'fa-check',
  'fa-circle-check',
  'fa-star',
  'fa-image',
  'fa-images',
  'fa-lightbulb',
  'fa-solar-panel',
  'fa-network-wired',
  'fa-server',
  'fa-lock',
  'fa-key',
  'fa-bell',
  'fa-tower-broadcast',
  'fa-faucet',
  'fa-droplet',
  'fa-water',
  'fa-fan',
  'fa-wind',
];

type Props = {
  label?: string;
  value: string;
  onChange: (icon: string) => void;
};

export function IconPicker({ label = 'Icono', value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^fa-/, '');
    if (!q) return ICONS;
    return ICONS.filter((icon) => icon.toLowerCase().includes(q));
  }, [query]);

  const current = value?.startsWith('fa-') ? value : value ? `fa-${value}` : 'fa-image';

  return (
    <div className="field icon-picker">
      <label>{label}</label>
      <div className="icon-picker-row">
        <button
          type="button"
          className="icon-picker-current"
          onClick={() => setOpen((v) => !v)}
          title="Elegir icono"
        >
          <i className={`fa-solid ${current}`} aria-hidden="true" />
          <span>{current}</span>
          <span className="icon-picker-caret">
            <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} />
          </span>
        </button>
        <input
          className="icon-picker-manual"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/^\s+/, ''))}
          placeholder="fa-bolt"
          aria-label="Nombre técnico del icono"
        />
      </div>

      {open && (
        <div className="icon-picker-panel">
          <input
            type="search"
            className="icon-picker-search"
            placeholder="Buscar icono…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="icon-picker-grid">
            {filtered.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`icon-picker-item ${icon === current ? 'is-active' : ''}`}
                onClick={() => {
                  onChange(icon);
                  setOpen(false);
                  setQuery('');
                }}
                title={icon}
              >
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="muted" style={{ gridColumn: '1 / -1', padding: 8 }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
