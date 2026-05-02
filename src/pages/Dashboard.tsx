import { Button } from '../design-system/components/ui/Button';
import { Card } from '../design-system/components/ui/Card';
import { Badge } from '../design-system/components/ui/Badge';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { useState } from 'react';

export const Dashboard = () => {
  const [filter, setFilter] = useState('calendar');

  return (
    <div className="dashboard-page">
      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-4)' }}>Overview</h2>
        <div className="grid-layout">
          <Card style={{ background: 'var(--color-primary)', color: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Today's Orders</h3>
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: '1.8rem', fontWeight: 700 }}>24</p>
          </Card>
          <Card>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Pending Dispatch</h3>
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: '1.8rem', fontWeight: 700 }}>8</p>
          </Card>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-4)' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={() => window.location.href='/materials'}>+ Raw Material</Button>
          <Button variant="outline">+ Stock In</Button>
          <Button variant="outline">+ New Order</Button>
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Recent Activity</h2>
          <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>View All</Button>
        </div>
        
        <SegmentedControl 
          options={[
            { label: 'Calendar', value: 'calendar' },
            { label: 'All Bookings', value: 'all_bookings' }
          ]} 
          value={filter} 
          onChange={setFilter} 
        />
        
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Order #1042</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Planet Agro • 50 Bundles</p>
            </div>
            <Badge status="ongoing">Ongoing</Badge>
          </Card>
          
          <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Order #1041</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tarpoline • 110 GSM</p>
            </div>
            <Badge status="completed">Completed</Badge>
          </Card>
        </div>
      </section>
    </div>
  );
};
