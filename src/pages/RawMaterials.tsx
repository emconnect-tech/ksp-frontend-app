import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Pagination } from '../design-system/components/ui/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { config } from '../config';

export const RawMaterials = () => {
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [tab, setTab] = useState('history');

  // --- IN state ---
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [entries, setEntries] = useState<any[]>([]);
  const [inFormData, setInFormData] = useState({
    rawMaterialTypeId: '',
    entryDate: new Date().toISOString().split('T')[0],
    gsm: '',
    rolls: '',
    weightKg: '',
    notes: ''
  });

  // --- OUT state ---
  const [outView, setOutView] = useState<'list' | 'details'>('list');
  const [selectedOutEntry, setSelectedOutEntry] = useState<any | null>(null);
  const [outIsEditing, setOutIsEditing] = useState(false);
  const [outEditData, setOutEditData] = useState<any>({});
  const [outEntries, setOutEntries] = useState<any[]>([]);
  const [outRollWeights, setOutRollWeights] = useState<Record<number, string>>({});
  const [outEditRollWeights, setOutEditRollWeights] = useState<Record<number, string>>({});
  const [outFormData, setOutFormData] = useState({
    rawMaterialTypeId: '',
    entryDate: new Date().toISOString().split('T')[0],
    gsm: '',
    rolls: '',
    notes: ''
  });

  // --- Pagination ---
  const [inPage, setInPage] = useState(0);
  const [inTotalPages, setInTotalPages] = useState(0);
  const [inTotalElements, setInTotalElements] = useState(0);
  const [outPage, setOutPage] = useState(0);
  const [outTotalPages, setOutTotalPages] = useState(0);
  const [outTotalElements, setOutTotalElements] = useState(0);
  const PAGE_SIZE = 20;

  // --- Shared ---
  const [rawMaterialTypes, setRawMaterialTypes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]); // available stock for OUT (IN - OUT, by weight)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOutId, setConfirmDeleteOutId] = useState<string | null>(null);

  const { token } = useAuth();
  const { canDelete, canEdit } = usePermissions();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const fetchEntries = async (iPage = inPage, oPage = outPage) => {
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
      const [inRes, outRes, invRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/raw-materials?page=${iPage}&size=${PAGE_SIZE}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/raw-material-out?page=${oPage}&size=${PAGE_SIZE}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/raw-materials/inventory`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (inRes.ok) {
        const data = await inRes.json();
        setEntries(data.content);
        setInTotalPages(data.totalPages);
        setInTotalElements(data.totalElements);
      }
      if (outRes.ok) {
        const data = await outRes.json();
        setOutEntries(data.content);
        setOutTotalPages(data.totalPages);
        setOutTotalElements(data.totalElements);
      }
      if (invRes.ok) setInventory(await invRes.json());
    } catch (e) {
      console.error('Failed to fetch raw materials', e);
    }
  };

  const findRmType = (typeId: string) =>
    rawMaterialTypes.find((t: any) => String(t.id) === typeId);

  const parseGsmFromName = (name: string): string => {
    const m = name?.match(/^(\d+)/);
    return m ? m[1] : '';
  };

  const availableForType = (typeId: string): number | null => {
    const line = inventory.find((i: any) =>
      (i.rawMaterialTypeId && String(i.rawMaterialTypeId) === typeId) ||
      (i.rawMaterialTypeVariantId && String(i.rawMaterialTypeVariantId) === typeId)
    );
    return line ? line.availableWeightKg : null;
  };

  useEffect(() => {
    // Restore direction from URL on mount
    const params = new URLSearchParams(window.location.search);
    const dir = params.get('dir');
    if (dir === 'out') setDirection('out');
    fetchEntries(0, 0);
    fetch(`${API_BASE_URL}/api/v1/raw-material-types`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setRawMaterialTypes).catch(() => {});
  }, []);

  useEffect(() => { fetchEntries(inPage, outPage); }, [inPage, outPage]);

  // Restore detail view from URL after entries load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const dir = params.get('dir');
    if (!id) return;
    if (dir === 'out' && outView !== 'details') {
      const entry = outEntries.find(e => String(e.id) === id);
      if (entry) { setSelectedOutEntry(entry); setOutIsEditing(false); setOutView('details'); }
    } else if (dir !== 'out' && view !== 'details') {
      const entry = entries.find(e => String(e.id) === id);
      if (entry) { setSelectedEntry(entry); setIsEditing(false); setView('details'); }
    }
  }, [entries, outEntries]);


  const handleDirectionChange = (d: string) => {
    setDirection(d as 'in' | 'out');
    setTab('history');
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

  const renderRollWeightInputs = (count: number, weights: Record<number, string>, onChange: (n: number, v: string) => void, label = 'Roll Weights (KG)') => {
    if (count < 1) return null;
    return (
      <div>
        <label style={{ display: 'block', marginBottom: 'var(--space-3)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</label>
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

  const typeDropdown = (value: string, onChange: (v: string) => void) => (
    <div>
      <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Material Type</label>
      <select
        className="input-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        required
      >
        <option value="">Select material type...</option>
        {rawMaterialTypes.filter((t: any) => t.isActive).map((t: any) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );


  // ===================== IN =====================

  const handleInTypeChange = (typeId: string) => {
    const type = typeId ? findRmType(typeId) : null;
    const gsm = type ? parseGsmFromName(type.name) : '';
    setInFormData(prev => ({ ...prev, rawMaterialTypeId: typeId, gsm: gsm || prev.gsm }));
  };

  const handleInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.USE_MOCK_API) { setTab('history'); return; }
    const payload = {
      rawMaterialTypeId: inFormData.rawMaterialTypeId || null,
      entryDate: inFormData.entryDate,
      gsm: parseInt(inFormData.gsm),
      noOfRolls: parseInt(inFormData.rolls),
      weightKg: inFormData.weightKg ? parseFloat(inFormData.weightKg) : 0,
      notes: inFormData.notes,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-materials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInFormData({ rawMaterialTypeId: '', entryDate: new Date().toISOString().split('T')[0], gsm: '', rolls: '', weightKg: '', notes: '' });
        fetchEntries();
        setTab('history');
      } else { alert('Failed to save entry'); }
    } catch (e) { alert('Failed to save entry'); }
  };

  const handleInStartEdit = () => {
    setEditData({ rawMaterialTypeId: selectedEntry.rawMaterialTypeId || '', entryDate: selectedEntry.entryDate || '', gsm: String(selectedEntry.gsm || ''), rolls: String(selectedEntry.noOfRolls || ''), weightKg: String(selectedEntry.weightKg || ''), notes: selectedEntry.notes || '' });
    setIsEditing(true);
  };

  const handleInSaveEdit = async () => {
    const payload = { rawMaterialTypeId: editData.rawMaterialTypeId || null, entryDate: editData.entryDate, gsm: parseInt(editData.gsm), noOfRolls: parseInt(editData.rolls), weightKg: editData.weightKg ? parseFloat(editData.weightKg) : 0, notes: editData.notes };
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
      if (selectedEntry?.id === id) { setView('list'); navigate('/materials?dir=in', { replace: true }); }
    } catch (e) { alert('Failed to delete entry'); }
  };

  const renderInAdd = () => {
    return (
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>New Raw Material — In</h2>
          <button onClick={() => setTab('history')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>✕ Cancel</button>
        </div>
        <form onSubmit={handleInSubmit}>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {typeDropdown(inFormData.rawMaterialTypeId, handleInTypeChange)}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
              <Input type="date" value={inFormData.entryDate} onChange={e => setInFormData(p => ({ ...p, entryDate: e.target.value }))} required />
            </div>
            <div className="grid-layout">
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
                <Input type="number" placeholder="Count" min="1" value={inFormData.rolls} onChange={e => setInFormData(p => ({ ...p, rolls: e.target.value }))} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Total Weight (KG)</label>
                <Input type="number" step="0.01" min="0" placeholder="Total KG" value={inFormData.weightKg} onChange={e => setInFormData(p => ({ ...p, weightKg: e.target.value }))} required />
              </div>
            </div>
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
    <div>
      {entries.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No incoming entries yet.</p>}
      {entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Material Type</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Rolls</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>GSM</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => { setSelectedEntry(entry); setIsEditing(false); setView('details'); navigate(`/materials?dir=in&id=${entry.id}`, { replace: true }); }}
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '10px 12px' }}>{entry.entryDate}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{entry.materialTypeName || 'Raw Material'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{entry.noOfRolls}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{entry.gsm ?? '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{entry.weightKg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={inPage} totalPages={inTotalPages} totalElements={inTotalElements} size={PAGE_SIZE} onPageChange={p => setInPage(p)} />
    </div>
  );

  const renderInDetails = () => {
    if (!selectedEntry) return null;
    const rollCount = selectedEntry.noOfRolls || 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button onClick={() => { setView('list'); setIsEditing(false); navigate('/materials?dir=in', { replace: true }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ArrowLeft size={24} /></button>
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
              {typeDropdown(editData.rawMaterialTypeId, (typeId) => { const type = typeId ? findRmType(typeId) : null; const gsm = type ? parseGsmFromName(type.name) : ''; setEditData((p: any) => ({ ...p, rawMaterialTypeId: typeId, gsm: gsm || p.gsm })); })}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
                <Input type="date" value={editData.entryDate} onChange={e => setEditData((p: any) => ({ ...p, entryDate: e.target.value }))} required />
              </div>
              <div className="grid-layout">
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>No. of Rolls</label>
                  <Input type="number" min="1" value={editData.rolls} onChange={e => setEditData((p: any) => ({ ...p, rolls: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Total Weight (KG)</label>
                  <Input type="number" step="0.01" min="0" value={editData.weightKg} onChange={e => setEditData((p: any) => ({ ...p, weightKg: e.target.value }))} required />
                </div>
              </div>
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
              <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Notes</label><div style={{ fontSize: '0.9rem', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>{selectedEntry.notes || '—'}</div></div>
            </div>
          )}
        </Card>
        {!isEditing && <Button variant="outline" style={{ width: '100%' }} onClick={() => { setView('list'); navigate('/materials?dir=in', { replace: true }); }}>Back to History</Button>}
      </div>
    );
  };

  // ===================== OUT =====================

  const handleOutTypeChange = (typeId: string) => {
    const inv = typeId ? inventory.find((i: any) => String(i.rawMaterialTypeId) === typeId) : null;
    const type = typeId ? findRmType(typeId) : null;
    const gsm = inv?.gsm ?? (type ? parseGsmFromName(type.name) : '');
    setOutFormData(prev => ({ ...prev, rawMaterialTypeId: typeId, gsm: gsm ? String(gsm) : '' }));
  };

  const handleOutRollCountChange = (value: string) => {
    setOutFormData(prev => ({ ...prev, rolls: value }));
    const count = parseInt(value) || 0;
    setOutRollWeights(prev => { const next: Record<number, string> = {}; for (let i = 1; i <= count; i++) next[i] = prev[i] ?? ''; return next; });
  };

  const handleOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.USE_MOCK_API) { setTab('history'); return; }
    const payload = {
      rawMaterialTypeId: outFormData.rawMaterialTypeId || null,
      entryDate: outFormData.entryDate,
      gsm: outFormData.gsm ? parseInt(outFormData.gsm) : null,
      noOfRolls: parseInt(outFormData.rolls),
      weightKg: sumRollWeights(outRollWeights) || 0,
      rollWeights: toRollWeightsPayload(outRollWeights),
      notes: outFormData.notes,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-out`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setOutFormData({ rawMaterialTypeId: '', entryDate: new Date().toISOString().split('T')[0], gsm: '', rolls: '', notes: '' });
        setOutRollWeights({});
        fetchEntries();
        setTab('history');
      } else { alert('Failed to save entry'); }
    } catch (e) { alert('Failed to save entry'); }
  };

  const handleOutStartEdit = () => {
    const boxes = selectedOutEntry.noOfRolls || 0;
    const existing: Record<number, string> = {};
    for (let i = 1; i <= boxes; i++) existing[i] = String(selectedOutEntry.rollWeights?.[i] ?? '');
    setOutEditRollWeights(existing);
    setOutEditData({ rawMaterialTypeId: selectedOutEntry.rawMaterialTypeId || '', entryDate: selectedOutEntry.entryDate || '', gsm: String(selectedOutEntry.gsm || ''), rolls: String(boxes), notes: selectedOutEntry.notes || '' });
    setOutIsEditing(true);
  };

  const handleOutEditRollCountChange = (newCount: string) => {
    const count = parseInt(newCount) || 0;
    setOutEditData((prev: any) => ({ ...prev, rolls: newCount }));
    setOutEditRollWeights(prev => { const next: Record<number, string> = {}; for (let i = 1; i <= count; i++) next[i] = prev[i] ?? ''; return next; });
  };

  const handleOutSaveEdit = async () => {
    const totalOut = sumRollWeights(outEditRollWeights);
    const invAvail = availableForType(outEditData.rawMaterialTypeId);
    if (invAvail != null) {
      // inventory already deducted this entry's current weight — add it back to get the true allowance
      const sameType = outEditData.rawMaterialTypeId === selectedOutEntry.rawMaterialTypeId;
      const allowance = invAvail + (sameType ? (selectedOutEntry.weightKg || 0) : 0);
      if (totalOut > allowance + 0.0001) {
        alert(`Only ${Math.round(allowance * 100) / 100} kg available in stock for this material. You entered ${totalOut} kg.`);
        return;
      }
    }
    const payload = { rawMaterialTypeId: outEditData.rawMaterialTypeId || null, entryDate: outEditData.entryDate, gsm: outEditData.gsm ? parseInt(outEditData.gsm) : null, noOfRolls: parseInt(outEditData.rolls), weightKg: sumRollWeights(outEditRollWeights) || 0, rollWeights: toRollWeightsPayload(outEditRollWeights), notes: outEditData.notes };
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
      if (selectedOutEntry?.id === id) { setOutView('list'); navigate('/materials?dir=out', { replace: true }); }
    } catch (e) { alert('Failed to delete entry'); }
  };

  const renderOutAdd = () => {
    const rollCount = parseInt(outFormData.rolls) || 0;
    const available = availableForType(outFormData.rawMaterialTypeId);
    const totalOut = sumRollWeights(outRollWeights);
    const overdrawn = available != null && totalOut > available + 0.0001;
    return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Raw Material — Out (Consumed)</h2>
        <button onClick={() => setTab('history')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>✕ Cancel</button>
      </div>
      <form onSubmit={handleOutSubmit}>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Material Type</label>
            {inventory.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No raw material in stock. Add a Raw Material — In entry first.</p>
            ) : (
              <select
                className="input-field"
                value={outFormData.rawMaterialTypeId}
                onChange={e => handleOutTypeChange(e.target.value)}
                required
              >
                <option value="">Select material type...</option>
                {inventory.map((inv: any) => {
                  const id = inv.rawMaterialTypeId || inv.rawMaterialTypeVariantId;
                  return (
                    <option key={id} value={id}>
                      {inv.materialTypeName}{inv.size ? ` • ${inv.size}` : ''} — {inv.availableWeightKg} kg
                    </option>
                  );
                })}
              </select>
            )}
            {available != null && (
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Available in stock: <strong style={{ color: 'var(--color-primary)' }}>{available} kg</strong>
              </p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
            <Input type="date" value={outFormData.entryDate} onChange={e => setOutFormData(p => ({ ...p, entryDate: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
            <Input type="text" value={outFormData.gsm ? `${outFormData.gsm} GSM` : ''} readOnly placeholder="Auto from material" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Rolls Consumed</label>
            <Input type="number" placeholder="Count" min="1" value={outFormData.rolls} onChange={e => handleOutRollCountChange(e.target.value)} required />
          </div>
          {rollCount > 0 && renderRollWeightInputs(rollCount, outRollWeights, (n, v) => setOutRollWeights(prev => ({ ...prev, [n]: v })))}
          {overdrawn && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#fa5252', fontWeight: 600 }}>
              Total {totalOut} kg exceeds available {available} kg.
            </p>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes (Optional)</label>
            <textarea className="input-field" rows={3} style={{ resize: 'vertical' }} value={outFormData.notes} onChange={e => setOutFormData(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <Button type="submit" variant="primary" disabled={overdrawn} style={{ width: '100%', marginTop: 'var(--space-6)' }}>Save Entry</Button>
      </form>
    </Card>
    );
  };

  const renderOutHistory = () => (
    <div>
      {outEntries.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No outgoing entries yet.</p>}
      {outEntries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Material Type</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Rolls</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>GSM</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {outEntries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => { setSelectedOutEntry(entry); setOutIsEditing(false); setOutView('details'); navigate(`/materials?dir=out&id=${entry.id}`, { replace: true }); }}
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '10px 12px' }}>{entry.entryDate}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{entry.materialTypeName || 'Raw Material'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{entry.noOfRolls}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{entry.gsm ?? '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{entry.weightKg || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={outPage} totalPages={outTotalPages} totalElements={outTotalElements} size={PAGE_SIZE} onPageChange={p => setOutPage(p)} />
    </div>
  );

  const renderOutDetails = () => {
    if (!selectedOutEntry) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button onClick={() => { setOutView('list'); setOutIsEditing(false); navigate('/materials?dir=out', { replace: true }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ArrowLeft size={24} /></button>
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
              {(() => {
                const inv = availableForType(outEditData.rawMaterialTypeId);
                const sameType = outEditData.rawMaterialTypeId === selectedOutEntry.rawMaterialTypeId;
                const allowance = (inv ?? 0) + (sameType ? (selectedOutEntry.weightKg || 0) : 0);
                return (
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Material Type</label>
                    <select
                      className="input-field"
                      value={outEditData.rawMaterialTypeId}
                      onChange={e => {
                        const typeId = e.target.value;
                        const invLine = inventory.find((i: any) => String(i.rawMaterialTypeId) === typeId);
                        const type = findRmType(typeId);
                        const g = invLine?.gsm ?? (type ? parseGsmFromName(type.name) : '');
                        setOutEditData((p: any) => ({ ...p, rawMaterialTypeId: typeId, gsm: g ? String(g) : '' }));
                      }}
                    >
                      <option value="">Select material type...</option>
                      {rawMaterialTypes.filter((t: any) => t.isActive).map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {(inv != null || sameType) && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Available in stock: <strong style={{ color: 'var(--color-primary)' }}>{Math.round(allowance * 100) / 100} kg</strong>
                      </p>
                    )}
                  </div>
                );
              })()}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Entry Date</label>
                <Input type="date" value={outEditData.entryDate} onChange={e => setOutEditData((p: any) => ({ ...p, entryDate: e.target.value }))} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>GSM</label>
                <Input type="text" value={outEditData.gsm ? `${outEditData.gsm} GSM` : ''} readOnly placeholder="Auto from material" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Rolls Consumed</label>
                <Input type="number" min="1" value={outEditData.rolls} onChange={e => handleOutEditRollCountChange(e.target.value)} required />
              </div>
              {parseInt(outEditData.rolls) > 0 && renderRollWeightInputs(parseInt(outEditData.rolls), outEditRollWeights, (n, v) => setOutEditRollWeights(prev => ({ ...prev, [n]: v })))}
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
                <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Weight</label><div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{selectedOutEntry.weightKg ? `${selectedOutEntry.weightKg} kg` : '—'}</div></div>
              </div>
              {(() => {
                const boxWeights: Record<number, number> = selectedOutEntry.rollWeights || {};
                const boxCount = selectedOutEntry.noOfRolls || 0;
                if (Object.keys(boxWeights).length === 0) return null;
                return (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-3)' }}>Roll Weights</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-3)' }}>
                      {Array.from({ length: boxCount }, (_, i) => i + 1).map(n => (
                        <div key={n} style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '-8px', left: '6px', fontSize: '10px', background: 'white', padding: '0 4px', color: 'var(--color-primary)', fontWeight: 600, zIndex: 1 }}>#{n}</span>
                          <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem' }}>
                            {boxWeights[n] != null ? boxWeights[n] : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div><label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Notes</label><div style={{ fontSize: '0.9rem', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>{selectedOutEntry.notes || '—'}</div></div>
            </div>
          )}
        </Card>
        {!outIsEditing && <Button variant="outline" style={{ width: '100%' }} onClick={() => { setOutView('list'); navigate('/materials?dir=out', { replace: true }); }}>Back to History</Button>}
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

          <div style={{ marginTop: 'var(--space-6)' }}>
            {tab === 'add' ? (
              direction === 'in' ? renderInAdd() : renderOutAdd()
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>History</h3>
                  <Button variant="primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => setTab('add')}>
                    + Add Entry
                  </Button>
                </div>
                {direction === 'in' ? renderInHistory() : renderOutHistory()}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
