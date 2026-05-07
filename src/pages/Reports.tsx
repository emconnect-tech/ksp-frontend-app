import { 
  Users, 
  Package,
  ArrowUpRight
} from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Badge } from '../design-system/components/ui/Badge';
import { Button } from '../design-system/components/ui/Button';

export const Reports = () => {

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>Analytics & Reports</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Live business intelligence and stock health.</p>
      </header>

      {/* Basic Metrics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            <Users size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Customers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>142</h2>
            <span style={{ color: 'var(--color-success)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <ArrowUpRight size={12} /> +12%
            </span>
          </div>
        </Card>
        <Card style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            <Package size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Order Velocity</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>18.4</h2>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>orders/day</span>
          </div>
        </Card>
      </div>

      {/* Stock Sufficiency (Inventory vs Demand) */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Package size={20} color="var(--color-primary)" />
          Product Stock Sufficiency
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            { item: 'Green Net 110GSM', stock: 120, orders: 85, unit: 'Bundles', status: 'Sufficient' },
            { item: 'Tarpaulin 90GSM', stock: 45, orders: 60, unit: 'Bundles', status: 'Shortage' },
            { item: 'Mulch Film 25M', stock: 200, orders: 120, unit: 'Rolls', status: 'Excess' },
          ].map((row, i) => {
            const ratio = (row.orders / row.stock) * 100;
            const isShortage = row.orders > row.stock;

            return (
              <Card key={i} style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontWeight: 600 }}>{row.item}</span>
                  <Badge status={isShortage ? 'ongoing' : 'completed'}>
                    {row.status}
                  </Badge>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Available Stock</p>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{row.stock} {row.unit}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Committed Demand</p>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: isShortage ? 'var(--color-error)' : 'inherit' }}>{row.orders} {row.unit}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'var(--color-surface-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(ratio, 100)}%`, 
                    height: '100%', 
                    background: isShortage ? 'var(--color-error)' : 'var(--color-primary)',
                    borderRadius: '4px'
                  }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {isShortage ? `Shortfall of ${row.orders - row.stock} ${row.unit}` : `Surplus of ${row.stock - row.orders} ${row.unit}`}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {ratio.toFixed(0)}% Utilized
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)', fontWeight: 700 }}>Export Data</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <Button variant="outline" style={{ fontSize: '0.8rem' }}>Download PDF</Button>
          <Button variant="outline" style={{ fontSize: '0.8rem' }}>Export Excel</Button>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
