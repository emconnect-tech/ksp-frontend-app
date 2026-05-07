import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';

// Mock Data matching implementation_plan.md schema
const mockEntries = [
  { id: '1', date: '2026-05-02', gsm: 110, rolls: 10, weightKg: 250.5, status: 'Active' },
  { id: '2', date: '2026-05-01', gsm: 90, rolls: 5, weightKg: 120.0, status: 'Active' },
];

export const RawMaterials = () => {
  const [tab, setTab] = useState('add');
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const handleViewDetails = (entry: any) => {
    setSelectedEntry(entry);
    setView('details');
  };

  const renderHistoryList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {mockEntries.map((entry) => (
          <Card 
            key={entry.id} 
            onClick={() => handleViewDetails(entry)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', cursor: 'pointer' }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{entry.rolls} Rolls ({entry.weightKg}kg)</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {entry.date} • {entry.gsm} GSM
              </p>
            </div>
            <Badge status="ongoing">{entry.status}</Badge>
          </Card>
        ))}
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedEntry) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Material Entry Details</h2>
        </div>

        <Card style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Entry ID</label>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-primary)' }}>#RM-00{selectedEntry.id}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Date</label>
                <div style={{ fontWeight: 600 }}>{selectedEntry.date}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Status</label>
                <Badge status="ongoing">{selectedEntry.status}</Badge>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>GSM</label>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.gsm}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>No. of Rolls</label>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.rolls}</div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Weight</label>
              <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.weightKg} KG</div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Notes</label>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>
                {selectedEntry.notes || 'No specific notes for this batch.'}
              </div>
            </div>
          </div>
        </Card>

        <Button variant="outline" style={{ width: '100%' }} onClick={() => setView('list')}>
          Back to History
        </Button>
      </div>
    );
  };

  const renderAddForm = () => {
    return (
      <Card>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>
          New Raw Material
        </h2>
        
        <form onSubmit={(e) => e.preventDefault()}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
              <Input type="number" placeholder="Enter GSM (e.g. 110)" />
            </div>
  
            <div className="grid-layout">
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
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
                placeholder="Any specific batch details..."
                style={{ resize: 'vertical' }}
              ></textarea>
            </div>
          </div>
  
          <Button variant="primary" style={{ width: '100%', marginTop: 'var(--space-6)' }}>
            Save Entry
          </Button>
        </form>
      </Card>
    );
  };

  return (
    <div className="page-content">
      {view === 'details' ? renderDetails() : (
        <>
          <SegmentedControl 
            options={[
              { label: 'Add Entry', value: 'add' },
              { label: 'History', value: 'history' }
            ]} 
            value={tab} 
            onChange={setTab} 
          />
          <div style={{ marginTop: 'var(--space-6)' }}>
            {tab === 'add' ? renderAddForm() : renderHistoryList()}
          </div>
        </>
      )}
    </div>
  );
};
