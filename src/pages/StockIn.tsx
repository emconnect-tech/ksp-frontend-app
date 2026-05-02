import { useState } from 'react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';

// Mock Data matching implementation_plan.md schema
const mockEntries = [
  { id: '1', date: '2026-05-02', type: 'Green Net - Planet Agro', gsm: 110, size: '30x60', bundles: 5, weightKg: 125.0, status: 'Completed' },
  { id: '2', date: '2026-05-01', type: 'Tarpaulin', gsm: 90, size: '40x40', bundles: 10, weightKg: 200.0, status: 'Completed' },
];

export const StockIn = () => {
  const [tab, setTab] = useState('add');

  return (
    <div className="page-content">
      <SegmentedControl 
        options={[
          { label: 'Add Stock-In', value: 'add' },
          { label: 'History', value: 'history' }
        ]} 
        value={tab} 
        onChange={setTab} 
      />

      <div style={{ marginTop: 'var(--space-6)' }}>
        {tab === 'add' ? (
          <Card>
            <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>
              Finished Good Entry
            </h2>
            
            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Stock Type / Product</label>
                  <select className="input-field" defaultValue="">
                    <option value="" disabled>Select Product...</option>
                    <option value="green_net">Green Net - Planet Agro</option>
                    <option value="tarpaulin">Tarpaulin</option>
                  </select>
                </div>

                <div className="grid-layout">
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
                    <Input type="number" placeholder="e.g. 110" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Size</label>
                    <Input type="text" placeholder="e.g. 30x60" />
                  </div>
                </div>

                <div className="grid-layout">
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Bundles</label>
                    <Input type="number" placeholder="Count" min="1" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Weight (KG)</label>
                    <Input type="number" step="0.01" placeholder="Total KG" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes (Optional)</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    placeholder="Auditor notes..."
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>

              <Button variant="primary" style={{ width: '100%', marginTop: 'var(--space-6)' }}>
                Save Stock-In
              </Button>
            </form>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {mockEntries.map((entry) => (
              <Card key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{entry.type}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {entry.bundles} Bundles ({entry.weightKg}kg)
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {entry.date} • {entry.gsm} GSM • {entry.size}
                  </p>
                </div>
                <Badge status="completed">Logged</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
