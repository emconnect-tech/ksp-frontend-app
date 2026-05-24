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
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [tab, setTab] = useState('add');

  // --- IN state ---
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editRollWeights, setEditRollWeights] = useState<Record<number, string>>({});
  const [entries, setEntries] = useState<any[]>([]);
  const [rollWeights, setRollWeights] = useState<Record<number, string>>({});
  const [inFormData, setInFormData] = useState({
    rawMaterialTypeVariantId: '',
    entryDate: new Date().toISOString().split('T')[0],
    gsm: '',
    rolls: '',
    notes: ''
  });

  // --- OUT state ---
  const [outView, setOutView] = useState<'list' | 'details'>('list');
  const [selectedOutEntry, setSelectedOutEntry] = useState<any | null>(null);
  const [outIsEditing, setOutIsEditing] = useState(false);
  const [outEditData, setOutEditData] = useState<any>({});
  const [outEntries, setOutEntries] = useState<any[]>([]);
  const [outFormData, setOutFormData] = useState({
    rawMaterialTypeVariantId: '',
    entryDate: new Date().toISOString().split('T')[0],
    gsm: '',
    rolls: '',
    weightKg: '',
    notes: ''
  });

  // --- Shared ---
  const [gsmList, setGsmList] = useState<any[]>([]);
  const [rawMaterialTypes, setRawMaterialTypes] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOutId, setConfirmDeleteOutId] = useState<string | null>(null);

  const { token } = useAuth();
  const { canDelete, canEdit } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const fetchEntries = async () => {
    if (config.USE_MOCK_API) {
      setEntries([
        { id: '1', entryDate: '2026-05-02', materialTypeName: 'HDPE Tape', gsm: 110, noOfRolls: 10, weightKg: 250.5, rollWeights: { 1: 25.5, 2: 26.0 } },
        { id: '2', entryDate: '2026-05-01', materialTypeName: null, gsm: 90, noOfRolls: 5, weightKg: 120.0, rollWeights: {} },
      ]);
      setOutEntries([
        { id: 'o1', entryDate: '2026-05-03', materialTypeName: 'HDPE Tape', gsm: 110, noOfRolls: 4, weightKg: 100.0 },
      ]);
      return;
    }
    try {
      const [inRes, outRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/raw-materials`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/raw-material-out`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (inRes.ok) setEntries(await inRes.json());
      if (outRes.ok) setOutEntries(await outRes.json());
    } catch (e) {
      console.error('Failed to fetch raw materials', e);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetch(`${API_BASE_URL}/api/v1/gsm`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setGsmList).catch(() => {});
    fetch(`${API_BASE_URL}/api/v1/raw-material-types`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setRawMaterialTypes).catch(() => {});
  }, []);

  const findRmVariant = (variantId: string) => {
    for (const t of rawMaterialTypes) {
      const v = t.variants?.find((v: any) => v.id === variantId);
      if (v) return { type: t, variant: v };
    }
    return null;
  };

  const handleDirectionChange = (d: string) => {
    setDirection(d as 'in' | 'out');
    setTab('add');
    setView('list');
    setOutView('list');
  };

  // --- Roll weight helpers ---
  const toRollWeightsPayload = (weights: Record<number, string>) => {
    const payload: Record<number, number> = {};
    Object.entries(weights).forEach(([k, v]) => { if (v !== '') payload[Number(k)] = parseFloat(v); });
    return payload;
  };

  const sumRollWeights = (weights: Record<number, string>) =>
    Object.values(weights).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const renderRollWeightInputs = (count: number, weights: Record<number, string>, onChange: (n: number, v: string) => void) => {
    if (count < 1) return null;
    return (
      <div>
        <label style={{ display: 'block', marginBottom: 'var(--space-3)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Roll Weights (KG)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-3)' }}>
          {Array.from({ length: count }, (_, i) => i + 1).map(n => (
            <div key={n} style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', top: '-8px', left: '6px', fontSize: '10px', background: 'white', padding: '0 4px', color: 'var(--color-primary)', fontWeight: 600, zIndex: 1 }}>#{n}</span>
              <Input type="number" step="0.01" min="0" style={{ textAlign: 'center', height: '44px' }} value={weights[n] ?? ''} onChange={e => onChange(n, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const variantDropdown = (value: string, onChange: (v: string) => void) => (
    <div>
      <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Material Type (Optional)</label>
      <select className="input-field" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— None / Manual entry —</option>
        {rawMaterialTypes.filter((t: any) => t.isActive).map((t: any) =>
          t.variants?.filter((v: any) => v.isActive).map((v: any) => (
            <option key={v.id} value={v.id}>{t.name}{v.gsm ? ` — ${v.gsm} GSM` : ''}{v.spec ? ` • ${v.spec}` : ''}</option>
          ))
        )}
      </select>
    </div>
  );

  const gsmField = (variantId: string, gsmValue: string, onGsmChange: (v: string) => void) => (
    <div>
      <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
      {variantId ? (
        <Input type="text" value={gsmValue ? `${gsmValue} GSM` : ''} readOnly style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }} />
      ) : (
        <select className="input-field" value={gsmValue} onChange={e => onGsmChange(e.target.value)} required>
          <option value="">Select GSM...</option>
          {gsmList.map((g: any) => <option key={g.id} value={String(g.value)}>{g.value} GSM{g.label ? ` — ${g.label}` : ''}</option>)}
        </select>
      )}
    </div>
  );

  // ===================== IN =====================

  const handleInVariantChange = (variantId: string) => {
    const found = variantId ? findRmVariant(variantId) : null;
    setInFormData(prev => ({ ...prev, rawMaterialTypeVariantId: variantId, gsm: found?.variant.gsm ? String(found.variant.gsm) : prev.gsm }));
  };

  const handleInRollCountChange = (value: string) => {
    setInFormData(prev => ({ ...prev, rolls: value }));
    const count = parseInt(value) || 0;
    setRollWeights(prev => { const next: Record<number, string> = {}; for (let i = 1; i <= count; i++) next[i] = prev[i] ?? ''; return next; });
  };

  const handleInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.USE_MOCK_API) { setTab('history'); return; }
    const rollWeightsPayload = toRollWeightsPayload(rollWeights);
    const payload = {
      rawMaterialTypeVariantId: inFormData.rawMaterialTypeVariantId || null,
      entryDate: inFormData.entryDate,
      gsm: parseInt(inFormData.gsm),
      noOfRolls: parseInt(inFormData.rolls),
      weightKg: sumRollWeights(rollWeights) || 0,
      rollWeights: rollWeightsPayload,
      notes: inFormData.notes,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInFormData({ rawMaterialTypeVariantId: '', entryDate: new Date().toISOString().split('T')[0], gsm: '', rolls: '', notes: '' });
        setRollWeights({});
        fetchEntries();
        setTab('history');
      } else { alert('Failed to save entry'); }
    } catch (e) { alert('Failed to save entry'); }
  };

  const handleInStartEdit = () => {
    const rolls = selectedEntry.noOfRolls || 0;
    const existing: Record<number, string> = {};
    for (let i = 1; i <= rolls; i++) existing[i] = String(selectedEntry.rollWeights?.[i] ?? '');
    setEditRollWeights(existing);
    setEditData({ rawMaterialTypeVariantId: selectedEntry.rawMaterialTypeVariantId || '', entryDate: selectedEntry.entryDate || '', gsm: String(selectedEntry.gsm || ''), rolls: String(rolls), notes: selectedEntry.notes || '' });
    setIsEditing(true);
  };

  const handleInEditRollCountChange = (newCount: string) => {
    const count = parseInt(newCount) || 0;
    setEditData((prev: any) => ({ ...prev, rolls: newCount }));
    setEditRollWeights(prev => { const next: Record<number, string> = {}; for (let i = 1; i <= count; i++) next[i] = prev[i] ?? ''; return next; });
  };

  const handleInSaveEdit = async () => {
    const rollWeightsPayload = toRollWeightsPayload(editRollWeights);
    const payload = { rawMaterialTypeVariantId: editData.rawMaterialTypeVariantId || null, entryDate: editData.entryDate, gsm: parseInt(editData.gsm), noOfRolls: parseInt(editData.rolls), weightKg: sumRollWeights(editRollWeights) || 0, rollWeights: rollWeightsPayload, notes: editData.notes };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials/${selectedEntry.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.ok) { setSelectedEntry(await res.json()); setIsEditing(false); fetchEntries(); }
      else alert('Failed to update entry');
    } catch (e) { alert('Failed to update entry'); }
  };

  const handleInDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId; setConfirmDeleteId(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/raw-materials/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setEntries(prev => prev.filter(e => e.id !== id));
      if (selectedEntry?.id === id) setView('list');
    } catch (e) { alert('Failed to delete entry'); }
  };

  const renderInAdd = () => {
    const rollCount = parseInt(inFormData.rolls) || 0;
    return (
      <Card>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>New Raw Material — In</h2>
        <form onSubmit={handleInSubmit}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {variantDropdown(inFormData.rawMaterialTypeVariantId, handleInVariantChange)}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
              <Input type="date" value={inFormData.entryDate} onChange={e => setInFormData(p => ({ ...p, entryDate: e.target.value }))} required />
            </div>
            {gsmField(inFormData.rawMaterialTypeVariantId, inFormData.gsm, v => setInFormData(p => ({ ...p, gsm: v })))}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
              <Input type="number" placeholder="Count" min="1" value={inFormData.rolls} onChange={e => handleInRollCountChange(e.target.value)} required />
            </div>
            {rollCount > 0 && renderRollWeightInputs(rollCount, rollWeights, (n, v) => setRollWeights(prev => ({ ...prev, [n]: v })))}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes (Optional)</label>
              <textarea className="input-field" rows={3} style={{ resize: 'vertical' }} value={inFormData.notes} onChange={e => setInFormData(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <Button type="submit" variant="primary" style={{ width: '100%', marginTop: 'var(--space-6)' }}>Save Entry</Button>
        </form>
      </Card>
    );
  };

  const renderInHistory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {entries.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No incoming entries yet.</p>}
      {entries.map((entry) => (
        <Card key={entry.id} onClick={() => { setSelectedEntry(entry); setIsEditing(false); setView('details'); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', cursor: 'pointer' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{entry.materialTypeName || 'Raw Material'} — {entry.noOfRolls} Rolls</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{entry.entryDate} • {entry.gsm} GSM • {entry.weightKg}kg</p>
          </div>
          <Badge status="ongoing">In</Badge>
        </Card>
      ))}
    </div>
  );

  const renderInDetails = () => {
    if (!selectedEntry) return null;
    const rollCount = selectedEntry.noOfRolls || 0;
    const existingRollWeights: Record<number, number> = selectedEntry.rollWeights || {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button onClick={() => { setView('list'); setIsEditing(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ArrowLeft size={24} /></button>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Raw Material In — Details</h2>
          </div>
          {!isEditing && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {canEdit && <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={handleInStartEdit}>Edit</Button>}
              {canDelete && <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem', color: '#fa5252', borderColor: '#fa5252' }} onClick={() => setConfirmDeleteId(selectedEntry.id)}>Delete</Button>}
            </div>
          )}
        </div>
        <Card style={{ padding: 'var(--space-6)' }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {variantDropdown(editData.rawMaterialTypeVariantId, v => { const found = v ? findRmVariant(v) : null; setEditData((p: any) => ({ ...p, rawMaterialTypeVariantId: v, gsm: found?.variant.gsm ? String(found.variant.gsm) : p.gsm })); })}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
                <Input type="date" value={editData.entryDate} onChange={e => setEditData((p: any) => ({ ...p, entryDate: e.target.value }))} required />
              </div>
              {gsmField(editData.rawMaterialTypeVariantId, editData.gsm, v => setEditData((p: any) => ({ ...p, gsm: v })))}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
                <Input type="number" min="1" value={editData.rolls} onChange={e => handleInEditRollCountChange(e.target.value)} required />
              </div>
              {parseInt(editData.rolls) > 0 && renderRollWeightInputs(parseInt(editData.rolls), editRollWeights, (n, v) => setEditRollWeights(prev => ({ ...prev, [n]: v })))}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes</label>
                <textarea className="input-field" rows={3} style={{ resize: 'vertical' }} value={editData.notes} onChange={e => setEditData((p: any) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button variant="primary" style={{ flex: 1 }} onClick={handleInSaveEdit}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {selectedEntry.materialTypeName && <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Material Type</label><div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedEntry.materialTypeName}</div></div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Date</label><div style={{ fontWeight: 600 }}>{selectedEntry.entryDate}</div></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>GSM</label><div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.gsm}</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Rolls</label><div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{rollCount}</div></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Weight</label><div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedEntry.weightKg} kg</div></div>
              </div>
              {Object.keys(existingRollWeights).length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-3)' }}>Roll Weights</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-3)' }}>
                    {Array.from({ length: rollCount }, (_, i) => i + 1).map(n => (
                      <div key={n} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-8px', left: '6px', fontSize: '10px', background: 'white', padding: '0 4px', color: 'var(--color-primary)', fontWeight: 600, zIndex: 1 }}>#{n}</span>
                        <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem' }}>
                          {existingRollWeights[n] != null ? existingRollWeights[n] : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Notes</label><div style={{ fontSize: '0.9rem', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>{selectedEntry.notes || '—'}</div></div>
            </div>
          )}
        </Card>
        {!isEditing && <Button variant="outline" style={{ width: '100%' }} onClick={() => setView('list')}>Back to History</Button>}
      </div>
    );
  };

  // ===================== OUT =====================

  const handleOutVariantChange = (variantId: string) => {
    const found = variantId ? findRmVariant(variantId) : null;
    setOutFormData(prev => ({ ...prev, rawMaterialTypeVariantId: variantId, gsm: found?.variant.gsm ? String(found.variant.gsm) : prev.gsm }));
  };

  const handleOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.USE_MOCK_API) { setTab('history'); return; }
    const payload = {
      rawMaterialTypeVariantId: outFormData.rawMaterialTypeVariantId || null,
      entryDate: outFormData.entryDate,
      gsm: outFormData.gsm ? parseInt(outFormData.gsm) : null,
      noOfRolls: parseInt(outFormData.rolls),
      weightKg: outFormData.weightKg ? parseFloat(outFormData.weightKg) : null,
      notes: outFormData.notes,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-out`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setOutFormData({ rawMaterialTypeVariantId: '', entryDate: new Date().toISOString().split('T')[0], gsm: '', rolls: '', weightKg: '', notes: '' });
        fetchEntries();
        setTab('history');
      } else { alert('Failed to save entry'); }
    } catch (e) { alert('Failed to save entry'); }
  };

  const handleOutStartEdit = () => {
    setOutEditData({ rawMaterialTypeVariantId: selectedOutEntry.rawMaterialTypeVariantId || '', entryDate: selectedOutEntry.entryDate || '', gsm: String(selectedOutEntry.gsm || ''), rolls: String(selectedOutEntry.noOfRolls || ''), weightKg: String(selectedOutEntry.weightKg || ''), notes: selectedOutEntry.notes || '' });
    setOutIsEditing(true);
  };

  const handleOutSaveEdit = async () => {
    const payload = { rawMaterialTypeVariantId: outEditData.rawMaterialTypeVariantId || null, entryDate: outEditData.entryDate, gsm: outEditData.gsm ? parseInt(outEditData.gsm) : null, noOfRolls: parseInt(outEditData.rolls), weightKg: outEditData.weightKg ? parseFloat(outEditData.weightKg) : null, notes: outEditData.notes };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-out/${selectedOutEntry.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.ok) { setSelectedOutEntry(await res.json()); setOutIsEditing(false); fetchEntries(); }
      else alert('Failed to update entry');
    } catch (e) { alert('Failed to update entry'); }
  };

  const handleOutDelete = async () => {
    if (!confirmDeleteOutId) return;
    const id = confirmDeleteOutId; setConfirmDeleteOutId(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/raw-material-out/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setOutEntries(prev => prev.filter(e => e.id !== id));
      if (selectedOutEntry?.id === id) setOutView('list');
    } catch (e) { alert('Failed to delete entry'); }
  };

  const renderOutAdd = () => (
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>Raw Material — Out (Consumed)</h2>
      <form onSubmit={handleOutSubmit}>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {variantDropdown(outFormData.rawMaterialTypeVariantId, handleOutVariantChange)}
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
            <Input type="date" value={outFormData.entryDate} onChange={e => setOutFormData(p => ({ ...p, entryDate: e.target.value }))} required />
          </div>
          {gsmField(outFormData.rawMaterialTypeVariantId, outFormData.gsm, v => setOutFormData(p => ({ ...p, gsm: v })))}
          <div className="grid-layout">
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Rolls Consumed</label>
              <Input type="number" placeholder="Count" min="1" value={outFormData.rolls} onChange={e => setOutFormData(p => ({ ...p, rolls: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Weight (KG, Optional)</label>
              <Input type="number" step="0.01" min="0" placeholder="Total KG" value={outFormData.weightKg} onChange={e => setOutFormData(p => ({ ...p, weightKg: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes (Optional)</label>
            <textarea className="input-field" rows={3} style={{ resize: 'vertical' }} value={outFormData.notes} onChange={e => setOutFormData(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <Button type="submit" variant="primary" style={{ width: '100%', marginTop: 'var(--space-6)' }}>Save Entry</Button>
      </form>
    </Card>
  );

  const renderOutHistory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {outEntries.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No outgoing entries yet.</p>}
      {outEntries.map((entry) => (
        <Card key={entry.id} onClick={() => { setSelectedOutEntry(entry); setOutIsEditing(false); setOutView('details'); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', cursor: 'pointer' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{entry.materialTypeName || 'Raw Material'} — {entry.noOfRolls} Rolls</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{entry.entryDate}{entry.gsm ? ` • ${entry.gsm} GSM` : ''}{entry.weightKg ? ` • ${entry.weightKg}kg` : ''}</p>
          </div>
          <Badge status="completed">Out</Badge>
        </Card>
      ))}
    </div>
  );

  const renderOutDetails = () => {
    if (!selectedOutEntry) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button onClick={() => { setOutView('list'); setOutIsEditing(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ArrowLeft size={24} /></button>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Raw Material Out — Details</h2>
          </div>
          {!outIsEditing && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {canEdit && <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={handleOutStartEdit}>Edit</Button>}
              {canDelete && <Button variant="outline" style={{ padding: '4px 12px', fontSize: '0.8rem', color: '#fa5252', borderColor: '#fa5252' }} onClick={() => setConfirmDeleteOutId(selectedOutEntry.id)}>Delete</Button>}
            </div>
          )}
        </div>
        <Card style={{ padding: 'var(--space-6)' }}>
          {outIsEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {variantDropdown(outEditData.rawMaterialTypeVariantId, v => { const found = v ? findRmVariant(v) : null; setOutEditData((p: any) => ({ ...p, rawMaterialTypeVariantId: v, gsm: found?.variant.gsm ? String(found.variant.gsm) : p.gsm })); })}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
                <Input type="date" value={outEditData.entryDate} onChange={e => setOutEditData((p: any) => ({ ...p, entryDate: e.target.value }))} required />
              </div>
              {gsmField(outEditData.rawMaterialTypeVariantId, outEditData.gsm, v => setOutEditData((p: any) => ({ ...p, gsm: v })))}
              <div className="grid-layout">
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Rolls Consumed</label>
                  <Input type="number" min="1" value={outEditData.rolls} onChange={e => setOutEditData((p: any) => ({ ...p, rolls: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Weight (KG)</label>
                  <Input type="number" step="0.01" min="0" value={outEditData.weightKg} onChange={e => setOutEditData((p: any) => ({ ...p, weightKg: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes</label>
                <textarea className="input-field" rows={3} style={{ resize: 'vertical' }} value={outEditData.notes} onChange={e => setOutEditData((p: any) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={() => setOutIsEditing(false)}>Cancel</Button>
                <Button variant="primary" style={{ flex: 1 }} onClick={handleOutSaveEdit}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {selectedOutEntry.materialTypeName && <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Material Type</label><div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedOutEntry.materialTypeName}</div></div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Date</label><div style={{ fontWeight: 600 }}>{selectedOutEntry.entryDate}</div></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>GSM</label><div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedOutEntry.gsm || '—'}</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Rolls Consumed</label><div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedOutEntry.noOfRolls}</div></div>
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Weight</label><div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedOutEntry.weightKg ? `${selectedOutEntry.weightKg} kg` : '—'}</div></div>
              </div>
              <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Notes</label><div style={{ fontSize: '0.9rem', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>{selectedOutEntry.notes || '—'}</div></div>
            </div>
          )}
        </Card>
        {!outIsEditing && <Button variant="outline" style={{ width: '100%' }} onClick={() => setOutView('list')}>Back to History</Button>}
      </div>
    );
  };

  // ===================== RENDER =====================

  const isInDetail = direction === 'in' && view === 'details';
  const isOutDetail = direction === 'out' && outView === 'details';

  return (
    <div className="page-content">
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Delete Entry?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>This will permanently remove this record.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleInDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteOutId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Delete Entry?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>This will permanently remove this record.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteOutId(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleOutDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {isInDetail ? renderInDetails() : isOutDetail ? renderOutDetails() : (
        <>
          <SegmentedControl
            options={[
              { label: 'Raw Material In', value: 'in' },
              { label: 'Raw Material Out', value: 'out' },
            ]}
            value={direction}
            onChange={handleDirectionChange}
          />

          <div style={{ marginTop: 'var(--space-4)' }}>
            <SegmentedControl
              options={[{ label: 'Add Entry', value: 'add' }, { label: 'History', value: 'history' }]}
              value={tab}
              onChange={setTab}
            />
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            {direction === 'in'
              ? (tab === 'add' ? renderInAdd() : renderInHistory())
              : (tab === 'add' ? renderOutAdd() : renderOutHistory())
            }
          </div>
        </>
      )}
    </div>
  );
};
