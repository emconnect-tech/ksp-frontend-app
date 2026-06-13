import { Button } from './Button';

interface PaginationProps {
  page: number;          // 0-based
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, totalElements, size, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 3) pages.push('...');
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
    if (page < totalPages - 4) pages.push('...');
    pages.push(totalPages - 1);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-4)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>
        {from}–{to} of {totalElements}
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
        <Button
          variant="outline"
          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          ‹
        </Button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--color-text-muted)' }}>…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'outline'}
              style={{ padding: '4px 10px', fontSize: '0.8rem', minWidth: '32px' }}
              onClick={() => onPageChange(p as number)}
            >
              {(p as number) + 1}
            </Button>
          )
        )}
        <Button
          variant="outline"
          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          ›
        </Button>
      </div>
    </div>
  );
};
