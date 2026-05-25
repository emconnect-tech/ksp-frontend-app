import { useState, useRef, useEffect } from 'react';

interface Variant {
  id: number | string;
  size?: string;
  gsm?: number | string;
  isActive?: boolean;
}

interface Product {
  id: number | string;
  name: string;
  isActive?: boolean;
  variants?: Variant[];
}

interface Props {
  productsList: Product[];
  value: number | string | null | undefined;
  onChange: (variantId: number | string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

// Strips spaces so "6x9" matches "6 X 9"
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export const ProductVariantPicker = ({ productsList, value, onChange, placeholder = 'Select product variant...', style }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number | string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedLabel = (() => {
    for (const p of productsList) {
      for (const v of p.variants ?? []) {
        if (String(v.id) === String(value)) return `${p.name} • ${v.size ?? ''}`;
      }
    }
    return null;
  })();

  const isSearching = search.trim().length > 0;
  const query = normalize(search);

  const filtered = productsList
    .filter(p => p.isActive !== false)
    .map(p => ({
      ...p,
      variants: (p.variants ?? []).filter(v =>
        v.isActive !== false &&
        (query === '' ||
          normalize(p.name).includes(query) ||
          normalize(v.size ?? '').includes(query) ||
          normalize(String(v.gsm ?? '')).includes(query))
      ),
    }))
    .filter(p => p.variants.length > 0);

  const toggleProduct = (id: number | string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  // When opening, pre-expand the product that owns the current value
  useEffect(() => {
    if (!open) return;
    for (const p of productsList) {
      for (const v of p.variants ?? []) {
        if (String(v.id) === String(value)) {
          setExpandedIds(new Set([p.id]));
          return;
        }
      }
    }
    setExpandedIds(new Set());
  }, [open]);

  const handleSelect = (variantId: number | string) => {
    onChange(variantId);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: selectedLabel ? 'var(--color-text)' : 'var(--color-text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel ?? placeholder}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-float)',
          maxHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search product or size (e.g. 6x9)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                outline: 'none',
                background: 'var(--color-surface-muted)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No results
              </div>
            ) : (
              filtered.map(p => {
                const expanded = isSearching || expandedIds.has(p.id);
                return (
                  <div key={p.id}>
                    {/* Product header — clickable to expand/collapse */}
                    <div
                      onClick={() => !isSearching && toggleProduct(p.id)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        background: 'var(--color-surface-muted)',
                        borderTop: '1px solid var(--color-border)',
                        cursor: isSearching ? 'default' : 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none',
                      }}
                    >
                      <span>{p.name}</span>
                      {!isSearching && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                          {expanded ? '▲' : '▼'}
                        </span>
                      )}
                    </div>

                    {/* Variants — shown when expanded or searching */}
                    {expanded && p.variants.map(v => (
                      <div
                        key={v.id}
                        onClick={() => handleSelect(v.id)}
                        style={{
                          padding: '8px 20px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          color: String(v.id) === String(value) ? 'var(--color-primary)' : 'var(--color-text)',
                          background: String(v.id) === String(value) ? 'rgba(230,100,50,0.08)' : 'transparent',
                          fontWeight: String(v.id) === String(value) ? 600 : 400,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={e => {
                          if (String(v.id) !== String(value))
                            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-muted)';
                        }}
                        onMouseLeave={e => {
                          if (String(v.id) !== String(value))
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <span>{v.size ?? '—'}</span>
                        {v.gsm && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{v.gsm} GSM</span>}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
