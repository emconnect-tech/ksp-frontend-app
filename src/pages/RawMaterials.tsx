import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { config } from '../config';

export const RawMaterials = () => {
  const [tab, setTab] = useState('add');
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [entries, setEntries] = useState<any[]>([]);
  
  const { token } = useAuth();
  const { canDelete, canEdit } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteEntry = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/raw-materials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setEntries(prev => prev.filter(e => e.id !== id));
      if (selectedEntry?.id === id) setView('list');
    } catch (e) {
      console.error(e);
      alert('Failed to delete entry');
    }
  };

  const fetchEntries = async () => {
    if (config.USE_MOCK_API) {
      setEntries([
        { id: '1', date: '2026-05-02', gsm: 110, rolls: 10, weightKg: 250.5, status: 'Active' },
        { id: '2', date: '2026-05-01', gsm: 90, rolls: 5, weightKg: 120.0, status: 'Active' },
      ]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch raw materials', e);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleViewDetails = (entry: any) => {
    setSelectedEntry(entry);
    setIsEditing(false);
    setView('details');
  };

  const handleStartEdit = () => {
    setEditData({
      entryDate: selectedEntry.entryDate || selectedEntry.date || '',
      gsm: String(selectedEntry.gsm || ''),
      rolls: String(selectedEntry.noOfRolls || selectedEntry.rolls || ''),
      weightKg: String(selectedEntry.weightKg || ''),
      notes: selectedEntry.notes || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        entryDate: editData.entryDate,
        gsm: parseInt(editData.gsm),
        noOfRolls: parseInt(editData.rolls),
        weightKg: parseFloat(editData.weightKg),
        notes: editData.notes,
      };
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials/${selectedEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedEntry(updated);
        setIsEditing(false);
        fetchEntries();
      } else {
        alert('Failed to update entry');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update entry');
    }
  };

  const renderHistoryList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {entries.map((entry) => (
          <Card 
            key={entry.id} 
            onClick={() => handleViewDetails(entry)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', cursor: 'pointer' }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{entry.noOfRolls || entry.rolls} Rolls ({entry.weightKg}kg)</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {entry.entryDate || entry.date} • {entry.gsm} GSM
              </p>
            </div>
            <Badge status="ongoing">{entry.status || 'Active'}</Badge>
          </Card>
        ))}
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedEntry) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button onClick={() => { setView('list'); setIsEditing(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Material Entry Details</h2>
          </div>
          {!isEditing && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {canEdit && (
                <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={handleStartEdit}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem', color: '#fa5252', borderColor: '#fa5252' }} onClick={() => setConfirmDeleteId(selectedEntry.id)}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        <Card style={{ padding: 'var(--space-6)' }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
                <Input type="date" value={editData.entryDate} onChange={e => setEditData({...editData, entryDate: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
                <Input type="number" value={editData.gsm} onChange={e => setEditData({...editData, gsm: e.target.value})} required min="1" />
              </div>
              <div className="grid-layout">
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
                  <Input type="number" min="1" value={editData.rolls} onChange={e => setEditData({...editData, rolls: e.target.value})} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Weight (KG)</label>
                  <Input type="number" step="0.01" min="0" value={editData.weightKg} onChange={e => setEditData({...editData, weightKg: e.target.value})} required />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes</label>
                <textarea className="input-field" rows={3} style={{ resize: 'vertical' }} value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button variant="primary" style={{ flex: 1 }} onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Entry ID</label>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-primary)' }}>#RM-00{selectedEntry.id}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Date</label>
                  <div style={{ fontWeight: 600 }}>{selectedEntry.entryDate || selectedEntry.date}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Status</label>
                  <Badge status="ongoing">{selectedEntry.status || 'Active'}</Badge>
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
                  <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.noOfRolls || selectedEntry.rolls}</div>
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
          )}
        </Card>

        {!isEditing && (
          <Button variant="outline" style={{ width: '100%' }} onClick={() => setView('list')}>
            Back to History
          </Button>
        )}
      </div>
    );
  };

  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    gsm: '',
    rolls: '',
    weightKg: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.USE_MOCK_API) {
      setTab('history');
      return;
    }
    
    const payload = {
      entryDate: formData.entryDate,
      gsm: parseInt(formData.gsm),
      noOfRolls: parseInt(formData.rolls),
      weightKg: parseFloat(formData.weightKg),
      notes: formData.notes
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormData({
          entryDate: new Date().toISOString().split('T')[0],
          gsm: '', rolls: '', weightKg: '', notes: ''
        });
        fetchEntries();
        setTab('history');
      } else {
        alert('Failed to save entry');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save entry');
    }
  };

  const renderAddForm = () => {
    return (
      <Card>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>
          New Raw Material
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
              <Input type="date" value={formData.entryDate} onChange={e => setFormData({...formData, entryDate: e.target.value})} required />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
              <Input type="number" placeholder="Enter GSM (e.g. 110)" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} required min="1" />
            </div>
  
            <div className="grid-layout">
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
                <Input type="number" placeholder="Count" min="1" value={formData.rolls} onChange={e => setFormData({...formData, rolls: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Weight (KG)</label>
                <Input type="number" step="0.01" placeholder="Total KG" value={formData.weightKg} onChange={e => setFormData({...formData, weightKg: e.target.value})} required min="0" />
              </div>
            </div>
  
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes (Optional)</label>
              <textarea 
                className="input-field" 
                rows={3} 
                placeholder="Any specific batch details..."
                style={{ resize: 'vertical' }}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </div>
  
          <Button type="submit" variant="primary" style={{ width: '100%', marginTop: 'var(--space-6)' }}>
            Save Entry
          </Button>
        </form>
      </Card>
    );
  };

  return (
    <div className="page-content">
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Delete Material Entry?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              This will permanently remove this raw material record. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleDeleteEntry}>Delete</Button>
            </div>
          </div>
        </div>
      )}

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
