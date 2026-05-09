import { 
  ChevronRight, 
  ShoppingBag, 
  Factory,
  Package,
  Users,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Button } from '../design-system/components/ui/Button';

import { useAuth } from '../contexts/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  const allModules = [
    { label: 'Orders', icon: <ShoppingBag size={20} color="var(--color-primary)" />, path: '/bookings', module: 'Bookings' },
    { label: 'Materials', icon: <Factory size={20} color="var(--color-primary)" />, path: '/materials', module: 'Materials' },
    { label: 'Stock-In', icon: <Package size={20} color="var(--color-primary)" />, path: '/stock-in', module: 'Stock-In' },
    { label: 'Customers', icon: <Users size={20} color="var(--color-primary)" />, path: '/customers', module: 'Bookings' },
    { label: 'Reports', icon: <Activity size={20} color="var(--color-primary)" />, path: '/reports', module: 'Reports' },
    { label: 'Admin', icon: <ShieldCheck size={20} color="var(--color-primary)" />, path: '/profile', module: 'Admin' },
  ];

  const visibleModules = allModules.filter(m => user?.modules.includes(m.module));

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
          KSP Operations
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Real-time business and production pulse.</p>
      </header>

      {/* Stats Row... */}

      {/* Horizontal Stats Row */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          gap: 'var(--space-4)', 
          paddingBottom: 'var(--space-2)',
          paddingRight: 'var(--space-4)',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }} className="no-scrollbar">
          
          {/* Sales Card 1 */}
          <Card style={{ flex: '0 0 220px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #E64400 100%)', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShoppingBag size={14} opacity={0.9} />
              <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, opacity: 0.9 }}>Today's Orders</p>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>12 Orders</h2>
          </Card>

          {/* Sales Card 2 */}
          <Card style={{ flex: '0 0 220px', border: '1px solid var(--color-border)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Sales Status</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>8</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>Quotes</div>
              </div>
              <div style={{ width: '1px', background: 'var(--color-border)' }}></div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-secondary)' }}>4</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>Bills</div>
              </div>
            </div>
          </Card>

          {/* Production Card 1 */}
          <Card style={{ flex: '0 0 220px', background: 'linear-gradient(135deg, var(--color-accent) 0%, #2A3AB9 100%)', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Factory size={14} opacity={0.9} />
              <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, opacity: 0.9 }}>Weight In / Out</p>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>1.2t / 0.8t</h2>
          </Card>

          {/* Production Card 2 */}
          <Card style={{ flex: '0 0 220px', border: '1px solid var(--color-border)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Stock Audits</p>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-secondary)' }}>14 Items</h2>
            <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--color-error)', fontWeight: 600 }}>6 Priority Required</p>
          </Card>

        </div>
      </section>

      {/* All Modules (Dynamically Filtered) */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)', fontWeight: 700 }}>All Modules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
          {visibleModules.map((m) => (
            <Button 
              key={m.label}
              variant="outline" 
              onClick={() => window.location.href = m.path}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-4)', height: 'auto', background: 'white' }}
            >
              {m.icon}
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{m.label}</span>
            </Button>
          ))}
        </div>
      </section>

      {/* Pipeline Overview */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Pipeline Overview</h3>
          <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            View Reports <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No active orders in pipeline.
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pipeline-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-primary) !important;
          background: var(--color-primary-light);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
