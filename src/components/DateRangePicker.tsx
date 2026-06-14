import { useState, useRef, useEffect } from 'react';

interface Props {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DateRangePicker = ({ start, end, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => start ? new Date(start).getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => start ? new Date(start).getMonth() : new Date().getMonth());
  const [tempStart, setTempStart] = useState(start);
  const [tempEnd, setTempEnd] = useState(end);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();
  const toStr = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const handleDay = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
    } else {
      if (dateStr < tempStart) { setTempStart(dateStr); setTempEnd(tempStart); }
      else setTempEnd(dateStr);
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) { onChange(tempStart, tempEnd); setOpen(false); }
  };

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const total = daysInMonth(viewYear, viewMonth);
  const offset = firstDay(viewYear, viewMonth);

  const label = start && end ? `${start}  →  ${end}` : 'Select date range';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ padding: '7px 14px', fontSize: '0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', color: start && end ? 'inherit' : 'var(--color-text-muted)' }}
      >
        {label}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px', zIndex: 200, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', minWidth: '270px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 8px', color: 'var(--color-primary)' }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{monthLabel}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 8px', color: 'var(--color-primary)' }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '4px' }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, padding: '2px 0' }}>{d}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
            {Array(offset).fill(null).map((_, i) => <div key={`x${i}`} />)}
            {Array(total).fill(null).map((_, i) => {
              const d = i + 1;
              const ds = toStr(viewYear, viewMonth, d);
              const isS = ds === tempStart;
              const isE = ds === tempEnd;
              const inRange = tempStart && tempEnd && ds > tempStart && ds < tempEnd;
              return (
                <button
                  key={d}
                  onClick={() => handleDay(ds)}
                  style={{
                    padding: '6px 0',
                    fontSize: '0.8rem',
                    border: 'none',
                    borderRadius: isS || isE ? '50%' : '2px',
                    background: isS || isE ? 'var(--color-primary)' : inRange ? 'var(--color-primary-light, #fff0eb)' : 'transparent',
                    color: isS || isE ? 'white' : 'inherit',
                    cursor: 'pointer',
                    fontWeight: isS || isE ? 700 : 400,
                    outline: 'none',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              {tempStart || '—'} → {tempEnd || '—'}
            </span>
            <button
              onClick={handleApply}
              disabled={!tempStart || !tempEnd}
              style={{ padding: '5px 14px', fontSize: '0.8rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: tempStart && tempEnd ? 'pointer' : 'default', opacity: tempStart && tempEnd ? 1 : 0.4, fontWeight: 600 }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
