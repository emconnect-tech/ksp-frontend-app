export const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🚀</div>
      <h2>{title} Screen</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        This page is being built out. It will integrate with the backend API soon.
      </p>
    </div>
  );
};
