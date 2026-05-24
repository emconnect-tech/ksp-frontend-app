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
  const [editRollWeights, setEditRollWeights] = useState<Record<number, string>>({});
  const [entries, setEntries] = useState<any[]>([]);
  const [rollWeights, setRollWeights] = useState<Record<number, string>>({});
  const [gsmList, setGsmList] = useState<any[]>([]);
  const [rawMaterialTypes, setRawMaterialTypes] = useState<any[]>([]);

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
        { id: '1', date: '2026-05-02', materialTypeName: 'HDPE Tape', gsm: 110, rolls: 10, weightKg: 250.5, status: 'Active', rollWeights: { 1: 25.5, 2: 26.0, 3: 24.8, 4: 25.1, 5: 25.0, 6: 24.9, 7: 25.3, 8: 25.0, 9: 24.7, 10: 24.2 } },
        { id: '2', date: '2026-05-01', materialTypeName: null, gsm: 90, rolls: 5, weightKg: 120.0, status: 'Active', rollWeights: { 1: 24.0, 2: 24.5, 3: 23.8, 4: 24.2, 5: 23.5 } },
      ]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setEntries(await res.json());
    } catch (e) {
      console.error('Failed to fetch raw materials', e);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetch(`${API_BASE_URL}/api/v1/gsm`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setGsmList)
      .catch(() => {});
    fetch(`${API_BASE_URL}/api/v1/raw-material-types`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setRawMaterialTypes)
      .catch(() => {});
  }, []);

  // Find a specific variant across all types
  const findRmVariant = (variantId: string) => {
    for (const t of rawMaterialTypes) {
      const v = t.variants?.find((v: any) => v.id === variantId);
      if (v) return { type: t, variant: v };
    }
    return null;
  };

  const handleViewDetails = (entry: any) => {
    setSelectedEntry(entry);
    setIsEditing(false);
    setView('details');
  };

  const handleStartEdit = () => {
    const rolls = selectedEntry.noOfRolls || selectedEntry.rolls || 0;
    const existing: Record<number, string> = {};
    for (let i = 1; i <= rolls; i++) {
      existing[i] = String(selectedEntry.rollWeights?.[i] ?? '');
    }
    setEditRollWeights(existing);
    setEditData({
      rawMaterialTypeVariantId: selectedEntry.rawMaterialTypeVariantId || '',
      entryDate: selectedEntry.entryDate || selectedEntry.date || '',
      gsm: String(selectedEntry.gsm || ''),
      rolls: String(rolls),
      notes: selectedEntry.notes || '',
    });
    setIsEditing(true);
  };

  const handleEditRollCountChange = (newCount: string) => {
    const count = parseInt(newCount) || 0;
    setEditData((prev: any) => ({ ...prev, rolls: newCount }));
    setEditRollWeights(prev => {
      const next: Record<number, string> = {};
      for (let i = 1; i <= count; i++) next[i] = prev[i] ?? '';
      return next;
    });
  };

  const handleEditVariantChange = (variantId: string) => {
    const found = variantId ? findRmVariant(variantId) : null;
    setEditData((prev: any) => ({
      ...prev,
      rawMaterialTypeVariantId: variantId,
      gsm: found?.variant.gsm ? String(found.variant.gsm) : prev.gsm,
    }));
  };

  const toRollWeightsPayload = (weights: Record<number, string>) => {
    const payload: Record<number, number> = {};
    Object.entries(weights).forEach(([k, v]) => {
      if (v !== '') payload[Number(k)] = parseFloat(v);
    });
    return payload;
  };

  const sumRollWeights = (weights: Record<number, string>) =>
    Object.values(weights).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const handleSaveEdit = async () => {
    try {
      const rollWeightsPayload = toRollWeightsPayload(editRollWeights);
      const payload = {
        rawMaterialTypeVariantId: editData.rawMaterialTypeVariantId || null,
        entryDate: editData.entryDate,
        gsm: parseInt(editData.gsm),
        noOfRolls: parseInt(editData.rolls),
        weightKg: sumRollWeights(editRollWeights) || 0,
        rollWeights: rollWeightsPayload,
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

  const renderRollWeightInputs = (
    count: number,
    weights: Record<number, string>,
    onChange: (rollNum: number, value: string) => void
  ) => {
    if (count < 1) return null;
    return (
      <div>
        <label style={{ display: 'block', marginBottom: 'var(--space-3)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Roll Weights (KG)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-3)' }}>
          {Array.from({ length: count }, (_, i) => i + 1).map(rollNum => (
            <div key={rollNum} style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', top: '-8px', left: '6px', fontSize: '10px', background: 'white', padding: '0 4px', color: 'var(--color-primary)', fontWeight: 600, zIndex: 1 }}>
                #{rollNum}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                style={{ textAlign: 'center', height: '44px' }}
                value={weights[rollNum] ?? ''}
                onChange={e => onChange(rollNum, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHistoryList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {entries.map((entry) => (
        <Card
          key={entry.id}
          onClick={() => handleViewDetails(entry)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', cursor: 'pointer' }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>
              {entry.materialTypeName || 'Raw Material'} — {entry.noOfRolls || entry.rolls} Rolls
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {entry.entryDate || entry.date} • {entry.gsm} GSM • {entry.weightKg}kg
            </p>
          </div>
          <Badge status="ongoing">{entry.status || 'Active'}</Badge>
        </Card>
      ))}
    </div>
  );

  const renderDetails = () => {
    if (!selectedEntry) return null;
    const rollCount = selectedEntry.noOfRolls || selectedEntry.rolls || 0;
    const existingRollWeights: Record<number, number> = selectedEntry.rollWeights || {};

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
              {canEdit && <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={handleStartEdit}>Edit</Button>}
              {canDelete && <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem', color: '#fa5252', borderColor: '#fa5252' }} onClick={() => setConfirmDeleteId(selectedEntry.id)}>Delete</Button>}
            </div>
          )}
        </div>

        <Card style={{ padding: 'var(--space-6)' }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Material Type (Optional)</label>
                <select className="input-field" value={editData.rawMaterialTypeVariantId} onChange={e => handleEditVariantChange(e.target.value)}>
                  <option value="">— None / Manual entry —</option>
                  {rawMaterialTypes.filter((t: any) => t.isActive).map((t: any) =>
                    t.variants?.filter((v: any) => v.isActive).map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {t.name}{v.gsm ? ` — ${v.gsm} GSM` : ''}{v.spec ? ` • ${v.spec}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
                <Input type="date" value={editData.entryDate} onChange={e => setEditData({...editData, entryDate: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
                {editData.rawMaterialTypeVariantId ? (
                  <Input type="text" value={editData.gsm ? `${editData.gsm} GSM` : ''} readOnly style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }} />
                ) : (
                  <select className="input-field" value={editData.gsm} onChange={e => setEditData({...editData, gsm: e.target.value})} required>
                    <option value="">Select GSM...</option>
                    {gsmList.map((g: any) => (
                      <option key={g.id} value={String(g.value)}>{g.value} GSM{g.label ? ` — ${g.label}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
                <Input type="number" min="1" value={editData.rolls} onChange={e => handleEditRollCountChange(e.target.value)} required />
              </div>
              {parseInt(editData.rolls) > 0 && renderRollWeightInputs(
                parseInt(editData.rolls),
                editRollWeights,
                (rollNum, val) => setEditRollWeights(prev => ({ ...prev, [rollNum]: val }))
              )}
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
              {selectedEntry.materialTypeName && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Material Type</label>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedEntry.materialTypeName}</div>
                </div>
              )}
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
                  <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{rollCount}</div>
                </div>
              </div>
              {Object.keys(existingRollWeights).length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-3)' }}>Roll Weights</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-3)' }}>
                    {Array.from({ length: rollCount }, (_, i) => i + 1).map(rollNum => (
                      <div key={rollNum} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-8px', left: '6px', fontSize: '10px', background: 'white', padding: '0 4px', color: 'var(--color-primary)', fontWeight: 600, zIndex: 1 }}>
                          #{rollNum}
                        </span>
                        <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem' }}>
                          {existingRollWeights[rollNum] != null ? `${existingRollWeights[rollNum]}` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    rawMaterialTypeVariantId: '',
    entryDate: new Date().toISOString().split('T')[0],
    gsm: '',
    rolls: '',
    notes: ''
  });

  const handleVariantChange = (variantId: string) => {
    const found = variantId ? findRmVariant(variantId) : null;
    setFormData(prev => ({
      ...prev,
      rawMaterialTypeVariantId: variantId,
      gsm: found?.variant.gsm ? String(found.variant.gsm) : prev.gsm,
    }));
  };

  const handleRollCountChange = (value: string) => {
    setFormData(prev => ({ ...prev, rolls: value }));
    const count = parseInt(value) || 0;
    setRollWeights(prev => {
      const next: Record<number, string> = {};
      for (let i = 1; i <= count; i++) next[i] = prev[i] ?? '';
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.USE_MOCK_API) { setTab('history'); return; }

    const rollWeightsPayload = toRollWeightsPayload(rollWeights);
    const payload = {
      rawMaterialTypeVariantId: formData.rawMaterialTypeVariantId || null,
      entryDate: formData.entryDate,
      gsm: parseInt(formData.gsm),
      noOfRolls: parseInt(formData.rolls),
      weightKg: sumRollWeights(rollWeights) || 0,
      rollWeights: rollWeightsPayload,
      notes: formData.notes
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormData({ rawMaterialTypeVariantId: '', entryDate: new Date().toISOString().split('T')[0], gsm: '', rolls: '', notes: '' });
        setRollWeights({});
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
    const rollCount = parseInt(formData.rolls) || 0;
    return (
      <Card>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>New Raw Material Entry</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Material Type (Optional)</label>
              <select className="input-field" value={formData.rawMaterialTypeVariantId} onChange={e => handleVariantChange(e.target.value)}>
                <option value="">— None / Manual entry —</option>
                {rawMaterialTypes.filter((t: any) => t.isActive).map((t: any) =>
                  t.variants?.filter((v: any) => v.isActive).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {t.name}{v.gsm ? ` — ${v.gsm} GSM` : ''}{v.spec ? ` • ${v.spec}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
              <Input type="date" value={formData.entryDate} onChange={e => setFormData({...formData, entryDate: e.target.value})} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
              {formData.rawMaterialTypeVariantId ? (
                <Input type="text" value={formData.gsm ? `${formData.gsm} GSM` : ''} readOnly style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }} />
              ) : (
                <select className="input-field" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} required>
                  <option value="">Select GSM...</option>
                  {gsmList.map((g: any) => (
                    <option key={g.id} value={String(g.value)}>{g.value} GSM{g.label ? ` — ${g.label}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
              <Input type="number" placeholder="Count" min="1" value={formData.rolls} onChange={e => handleRollCountChange(e.target.value)} required />
            </div>
            {rollCount > 0 && renderRollWeightInputs(
              rollCount,
              rollWeights,
              (rollNum, val) => setRollWeights(prev => ({ ...prev, [rollNum]: val }))
            )}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes (Optional)</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Any specific batch details..."
                style={{ resize: 'vertical' }}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
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
            options={[{ label: 'Add Entry', value: 'add' }, { label: 'History', value: 'history' }]}
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
