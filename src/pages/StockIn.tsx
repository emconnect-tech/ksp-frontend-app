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

export const StockIn = () => {
  const [tab, setTab] = useState('add');
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  
  const [entries, setEntries] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  
  const { token } = useAuth();
  const { canDelete, canEdit } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteEntry = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/stock-in/${id}`, {
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

  const fetchData = async () => {
    if (config.USE_MOCK_API) {
      setEntries([
        { id: '1', entryDate: '2026-05-02T10:00:00', type: 'Green Net - Planet Agro', gsm: 110, size: '30x60', noOfBundles: 5, weightKg: 125.0, isActive: true },
        { id: '2', entryDate: '2026-05-01T10:00:00', type: 'Tarpaulin', gsm: 90, size: '40x40', noOfBundles: 10, weightKg: 200.0, isActive: true },
      ]);
      setProductsList([{ id: 'mock-prod-1', name: 'Green Net', variants: [{ id: 'mock-var-1', size: '110GSM' }] }]);
      return;
    }
    try {
      const stockRes = await fetch(`${API_BASE_URL}/api/v1/stock-in`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (stockRes.ok) setEntries(await stockRes.json());
      
      const prodRes = await fetch(`${API_BASE_URL}/api/v1/products`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (prodRes.ok) setProductsList(await prodRes.json());
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = (entry: any) => {
    setSelectedEntry(entry);
    setIsEditing(false);
    setView('details');
  };

  const handleStartEdit = () => {
    setEditData({
      productVariantId: selectedEntry.productVariantId || '',
      entryDate: selectedEntry.entryDate ? selectedEntry.entryDate.substring(0, 19) : '',
      gsm: String(selectedEntry.gsm || ''),
      size: selectedEntry.size || '',
      bundles: String(selectedEntry.noOfBundles || ''),
      weightKg: String(selectedEntry.weightKg || ''),
      notes: selectedEntry.notes || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        productVariantId: editData.productVariantId,
        entryDate: editData.entryDate,
        gsm: parseInt(editData.gsm),
        size: editData.size,
        noOfBundles: parseInt(editData.bundles),
        weightKg: parseFloat(editData.weightKg),
        notes: editData.notes,
      };
      const res = await fetch(`${API_BASE_URL}/api/v1/stock-in/${selectedEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedEntry(updated);
        setIsEditing(false);
        fetchData();
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
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{entry.type || `Variant ${entry.productVariantId?.substring(0,6)}`}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {entry.noOfBundles} Bundles ({entry.weightKg}kg)
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {new Date(entry.entryDate).toLocaleDateString()} • {entry.gsm} GSM • {entry.size}
              </p>
            </div>
            <Badge status="completed">Logged</Badge>
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
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Stock Entry Details</h2>
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
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Stock Type / Product</label>
                <select className="input-field" value={editData.productVariantId} onChange={e => setEditData({...editData, productVariantId: e.target.value})} required>
                  <option value="" disabled>Select Product Variant...</option>
                  {productsList.map((p: any) =>
                    p.variants?.map((v: any) => (
                      <option key={v.id} value={v.id}>{p.name} - {v.size}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="grid-layout">
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
                  <Input type="number" value={editData.gsm} onChange={e => setEditData({...editData, gsm: e.target.value})} required min="1" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Size</label>
                  <Input type="text" value={editData.size} onChange={e => setEditData({...editData, size: e.target.value})} />
                </div>
              </div>
              <div className="grid-layout">
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Bundles</label>
                  <Input type="number" min="1" value={editData.bundles} onChange={e => setEditData({...editData, bundles: e.target.value})} required />
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
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-primary)' }}>#STK-00{selectedEntry.id}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Product / Stock Type</label>
                <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>{selectedEntry.type || `Variant ${selectedEntry.productVariantId?.substring(0,6)}`}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Date</label>
                  <div style={{ fontWeight: 600 }}>{selectedEntry.entryDate ? new Date(selectedEntry.entryDate).toLocaleDateString() : '—'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Status</label>
                  <Badge status="completed">Logged</Badge>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>GSM</label>
                  <div style={{ fontWeight: 600 }}>{selectedEntry.gsm} GSM</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Size</label>
                  <div style={{ fontWeight: 600 }}>{selectedEntry.size || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>No. of Bundles</label>
                  <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.noOfBundles}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Weight</label>
                  <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.weightKg} KG</div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Notes</label>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>
                  {selectedEntry.notes || 'No special auditor remarks for this entry.'}
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
    productVariantId: '',
    entryDate: new Date().toISOString().split('T')[0] + 'T00:00:00',
    gsm: '',
    size: '',
    bundles: '',
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
      productVariantId: formData.productVariantId,
      entryDate: formData.entryDate,
      gsm: parseInt(formData.gsm),
      size: formData.size,
      noOfBundles: parseInt(formData.bundles),
      weightKg: parseFloat(formData.weightKg),
      notes: formData.notes
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormData({
          productVariantId: '',
          entryDate: new Date().toISOString().split('T')[0] + 'T00:00:00',
          gsm: '', size: '', bundles: '', weightKg: '', notes: ''
        });
        fetchData();
        setTab('history');
      } else {
        alert('Failed to save stock-in entry');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save stock-in entry');
    }
  };

  const renderAddForm = () => {
    return (
      <Card>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>
          Finished Good Entry
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Stock Type / Product</label>
              <select className="input-field" value={formData.productVariantId} onChange={e => setFormData({...formData, productVariantId: e.target.value})} required>
                <option value="" disabled>Select Product Variant...</option>
                {productsList.map(p => 
                  p.variants?.map((v: any) => (
                    <option key={v.id} value={v.id}>{p.name} - {v.size}</option>
                  ))
                )}
              </select>
            </div>
  
            <div className="grid-layout">
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
                <Input type="number" placeholder="e.g. 110" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} required min="1" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Size</label>
                <Input type="text" placeholder="e.g. 30x60" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} />
              </div>
            </div>
  
            <div className="grid-layout">
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Bundles</label>
                <Input type="number" placeholder="Count" min="1" value={formData.bundles} onChange={e => setFormData({...formData, bundles: e.target.value})} required />
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
                placeholder="Auditor notes..."
                style={{ resize: 'vertical' }}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </div>
  
          <Button type="submit" variant="primary" style={{ width: '100%', marginTop: 'var(--space-6)' }}>
            Save Stock-In
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
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Delete Stock Entry?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              This will permanently remove this stock-in record. This cannot be undone.
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
              { label: 'Add Stock-In', value: 'add' },
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
