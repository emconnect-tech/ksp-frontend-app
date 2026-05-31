import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

import { usePermissions } from '../hooks/usePermissions';
import { config } from '../config';

export const AdminSettings = () => {
  const location = useLocation();
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'catalog';
  });
  const [catalogView, setCatalogView] = useState<'products' | 'rawMaterials'>('products');
  const [catalogSearch, setCatalogSearch] = useState('');

  const [showAddProduct, setShowAddProduct] = useState(false);
  const { token } = useAuth();
  const { canDelete, canManageCatalog, canManageUsers } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [_loadingProducts, setLoadingProducts] = useState(false);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Statuses state
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);

  // GSM Master state
  const [gsmList, setGsmList] = useState<any[]>([]);
  const [newGsmValue, setNewGsmValue] = useState('');
  const [newGsmLabel, setNewGsmLabel] = useState('');
  const [showAddGsm, setShowAddGsm] = useState(false);
  const [editingGsmId, setEditingGsmId] = useState<string | null>(null);
  const [editGsmValue, setEditGsmValue] = useState('');
  const [editGsmLabel, setEditGsmLabel] = useState('');

  // WhatsApp state
  const [waStatus, setWaStatus] = useState<'connected' | 'qr_pending' | 'disconnected' | 'loading'>('loading');
  const [waQr, setWaQr] = useState<string | null>(null);

  // Raw Material Types state
  const [rawMaterialTypes, setRawMaterialTypes] = useState<any[]>([]);
  const [showAddRmType, setShowAddRmType] = useState(false);
  const [newRmName, setNewRmName] = useState('');
  const [newRmDesc, setNewRmDesc] = useState('');
  const [editingRmTypeId, setEditingRmTypeId] = useState<string | null>(null);
  const [editRmName, setEditRmName] = useState('');
  const [editRmDesc, setEditRmDesc] = useState('');
  const [addingVariantForRmTypeId, setAddingVariantForRmTypeId] = useState<string | null>(null);
  const [newRmVariantGsm, setNewRmVariantGsm] = useState('');
  const [newRmVariantSpec, setNewRmVariantSpec] = useState('');
  const [newRmVariantWeight, setNewRmVariantWeight] = useState('');
  const [editingRmVariant, setEditingRmVariant] = useState<{ typeId: string; variantId: string } | null>(null);
  const [editRmVariantData, setEditRmVariantData] = useState({ gsm: '', spec: '', weight: '' });
  const [confirmDeleteRmVariant, setConfirmDeleteRmVariant] = useState<{ typeId: string; variantId: string; label: string } | null>(null);

  useEffect(() => {
    if (tab === 'users') {
      fetchUsers();
    } else if (tab === 'catalog') {
      fetchProducts();
      fetchRawMaterialTypes();
    } else if (tab === 'masters') {
      fetchStatuses();
      fetchGsmList();
    } else if (tab === 'whatsapp') {
      fetchWaStatus();
    }
  }, [tab, searchQuery]);

  // Auto-poll every 5s while QR is pending or connecting
  useEffect(() => {
    if (tab !== 'whatsapp' || waStatus === 'connected') return;
    const interval = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(interval);
  }, [tab, waStatus]);

  // --- WhatsApp ---
  const fetchWaStatus = async () => {
    try {
      const statusRes = await fetch(`${config.WHATSAPP_WEB_URL}/status`);
      if (!statusRes.ok) { setWaStatus('disconnected'); return; }
      const { status } = await statusRes.json();

      if (status === 'qr_pending') {
        const tokenParam = config.WHATSAPP_ADMIN_TOKEN ? `?token=${config.WHATSAPP_ADMIN_TOKEN}` : '';
        const qrRes = await fetch(`${config.WHATSAPP_WEB_URL}/qr${tokenParam}`);
        if (qrRes.ok) {
          const { qr } = await qrRes.json();
          setWaQr(qr);
        }
      } else {
        setWaQr(null);
      }
      setWaStatus(status);
    } catch {
      setWaStatus('disconnected');
    }
  };

  // --- GSM ---
  const fetchGsmList = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/gsm?includeInactive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setGsmList(await res.json());
    } catch (e) {
      console.error('Failed to fetch GSM list', e);
    }
  };

  const handleAddGsm = async () => {
    if (!newGsmValue.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/gsm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ value: parseInt(newGsmValue), label: newGsmLabel || null }),
      });
      if (res.ok) {
        setNewGsmValue(''); setNewGsmLabel(''); setShowAddGsm(false);
        fetchGsmList();
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveGsm = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/gsm/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ value: parseInt(editGsmValue), label: editGsmLabel || null }),
      });
      if (res.ok) { setEditingGsmId(null); fetchGsmList(); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteGsm = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/gsm/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchGsmList();
    } catch (e) { console.error(e); }
  };

  // --- Statuses ---
  const fetchStatuses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/statuses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setOrderStatuses(await res.json());
    } catch (e) {
      console.error('Failed to fetch statuses', e);
    }
  };

  // --- Products ---
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      if (config.USE_MOCK_API) {
        setProducts([
          { id: 1, name: 'Green Net (Planet Agro)', isActive: true, variants: [{ size: '110 GSM • 30x60', rateOverride: 2500 }, { size: '90 GSM • 40x40', rateOverride: 3200 }] },
          { id: 2, name: 'Tarpaulin', isActive: true, variants: [{ size: '120 GSM • 50x50', rateOverride: 4500 }] },
        ]);
        setLoadingProducts(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/products?includeInactive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error('Failed to fetch products', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // --- Raw Material Types ---
  const fetchRawMaterialTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-types?includeInactive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setRawMaterialTypes(await res.json());
    } catch (e) {
      console.error('Failed to fetch raw material types', e);
    }
  };

  const handleAddRmType = async () => {
    if (!newRmName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newRmName, description: newRmDesc || null }),
      });
      if (res.ok) {
        setNewRmName(''); setNewRmDesc(''); setShowAddRmType(false);
        fetchRawMaterialTypes();
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveRmType = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editRmName, description: editRmDesc || null }),
      });
      if (res.ok) { setEditingRmTypeId(null); fetchRawMaterialTypes(); }
    } catch (e) { console.error(e); }
  };

  const toggleRmTypeStatus = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/raw-material-types/${id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchRawMaterialTypes();
    } catch (e) { console.error(e); }
  };

  const handleAddRmVariant = async (typeId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-types/${typeId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gsm: newRmVariantGsm ? parseInt(newRmVariantGsm) : null,
          spec: newRmVariantSpec || null,
          weightPerRollKg: newRmVariantWeight ? parseFloat(newRmVariantWeight) : null,
        }),
      });
      if (res.ok) {
        setAddingVariantForRmTypeId(null);
        setNewRmVariantGsm(''); setNewRmVariantSpec(''); setNewRmVariantWeight('');
        fetchRawMaterialTypes();
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveRmVariant = async () => {
    if (!editingRmVariant) return;
    const { typeId, variantId } = editingRmVariant;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/raw-material-types/${typeId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gsm: editRmVariantData.gsm ? parseInt(editRmVariantData.gsm) : null,
          spec: editRmVariantData.spec || null,
          weightPerRollKg: editRmVariantData.weight ? parseFloat(editRmVariantData.weight) : null,
        }),
      });
      if (res.ok) { setEditingRmVariant(null); fetchRawMaterialTypes(); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteRmVariant = async () => {
    if (!confirmDeleteRmVariant) return;
    const { typeId, variantId } = confirmDeleteRmVariant;
    setConfirmDeleteRmVariant(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/raw-material-types/${typeId}/variants/${variantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchRawMaterialTypes();
    } catch (e) { console.error(e); }
  };

  // --- Users ---
  const fetchUsers = async () => {
    try {
      let urlStr = `${API_BASE_URL}/api/v1/users`;
      if (searchQuery.trim()) urlStr += `?search=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(urlStr, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [addingVariantForProductId, setAddingVariantForProductId] = useState<string | null>(null);
  const [newVariantGsm, setNewVariantGsm] = useState('');
  const [newVariantSize, setNewVariantSize] = useState('');
  const [newVariantRate, setNewVariantRate] = useState('');
  const [newVariantPieces, setNewVariantPieces] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductDesc, setEditProductDesc] = useState('');
  const [editingVariant, setEditingVariant] = useState<{ productId: string; variantId: string } | null>(null);
  const [editVariantData, setEditVariantData] = useState({ gsm: '', size: '', rate: '', pieces: '' });
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'variant'; productId: string; variantId: string; label: string } | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteUser = async () => {
    if (!confirmDeleteUserId) return;
    const { id } = confirmDeleteUserId;
    setConfirmDeleteUserId(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      console.error('Failed to delete user', e);
    }
  };

  const handleDeleteVariant = async () => {
    if (!confirmDelete) return;
    const { productId, variantId } = confirmDelete;
    setConfirmDelete(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/products/${productId}/variants/${variantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchProducts();
    } catch (e) {
      console.error('Failed to delete variant', e);
    }
  };

  const handleSaveProduct = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editProductName, description: editProductDesc }),
      });
      if (res.ok) { setEditingProductId(null); fetchProducts(); }
      else alert('Failed to update product');
    } catch (e) { alert('Failed to update product'); }
  };

  const handleSaveVariant = async () => {
    if (!editingVariant) return;
    const { productId, variantId } = editingVariant;
    const payload: Record<string, any> = {
      rateOverride: editVariantData.rate ? parseFloat(editVariantData.rate) : null,
    };
    if (editVariantData.gsm) payload.gsm = parseInt(editVariantData.gsm);
    if (editVariantData.size) payload.size = editVariantData.size;
    if (editVariantData.pieces) payload.noOfPieces = parseInt(editVariantData.pieces);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingVariant(null);
        fetchProducts();
      } else {
        const errBody = await res.text();
        console.error('Update variant failed', res.status, errBody);
        alert(`Failed to update variant (${res.status}): ${errBody}`);
      }
    } catch (e) {
      console.error('Update variant error', e);
      alert('Failed to update variant: ' + e);
    }
  };

  const handleAddVariant = async (productId: string) => {
    if (!newVariantRate.trim() || !newVariantSize.trim()) {
      alert('Size and Rate are required.');
      return;
    }
    const payload: Record<string, any> = {
      size: newVariantSize,
      rateOverride: parseFloat(newVariantRate),
    };
    if (newVariantGsm) payload.gsm = parseInt(newVariantGsm);
    if (newVariantPieces) payload.noOfPieces = parseInt(newVariantPieces);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAddingVariantForProductId(null);
        setNewVariantGsm(''); setNewVariantSize(''); setNewVariantRate(''); setNewVariantPieces('');
        fetchProducts();
      } else {
        const errBody = await res.text();
        console.error('Add variant failed', res.status, errBody);
        alert(`Failed to add variant (${res.status}): ${errBody}`);
      }
    } catch (e) { console.error('Failed to add variant', e); }
  };

  const toggleProductStatus = async (id: string | number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/products/${id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Toggle failed');
    } catch (e) {
      fetchProducts();
    }
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newProductName, description: newProductDesc, variants: [] })
      });
      if (res.ok) {
        setNewProductName(''); setNewProductDesc(''); setShowAddProduct(false);
        fetchProducts();
      }
    } catch (e) { console.error('Error creating product', e); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (e) { fetchUsers(); }
  };

  const updateRole = async (id: string, newRole: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (e) { fetchUsers(); }
  };

  const renderUsersTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Team Management</h3>
        <Input
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
      </div>
      {users.map(user => (
        <Card key={user.id} style={{ padding: 'var(--space-4)', opacity: user.status === 'Disabled' ? 0.6 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user.name || 'New User'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{user.phoneNumber}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Role:
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  style={{ background: 'none', border: 'none', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="SUPER_ADMIN">Superadmin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge
                status={user.status === 'ACTIVE' || user.status === 'Approved' ? 'completed' : 'ongoing'}
                style={{
                  background: user.status === 'SUSPENDED' || user.status === 'Rejected' || user.status === 'Disabled' ? '#fff5f5' : undefined,
                  color: user.status === 'SUSPENDED' || user.status === 'Rejected' || user.status === 'Disabled' ? '#fa5252' : undefined,
                  borderColor: user.status === 'SUSPENDED' || user.status === 'Rejected' || user.status === 'Disabled' ? '#ffe3e3' : undefined
                }}
              >
                {user.status}
              </Badge>
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px', justifyContent: 'flex-end' }}>
                {(user.status === 'PENDING' || user.status === 'Pending') && (
                  <>
                    <Button variant="primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => updateStatus(user.id, 'ACTIVE')}>Approve</Button>
                    <Button variant="outline" style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#fa5252' }} onClick={() => updateStatus(user.id, 'SUSPENDED')}>Reject</Button>
                  </>
                )}
                {(user.status === 'ACTIVE' || user.status === 'Approved') && (
                  <Button variant="outline" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => updateStatus(user.id, 'SUSPENDED')}>Disable</Button>
                )}
                {(user.status === 'SUSPENDED' || user.status === 'Disabled') && (
                  <Button variant="primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => updateStatus(user.id, 'ACTIVE')}>Enable</Button>
                )}
                {canDelete && (
                  <Button variant="outline" style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#fa5252', borderColor: '#fa5252' }} onClick={() => setConfirmDeleteUserId({ id: user.id, name: user.name || user.phoneNumber })}>Delete</Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderProductsCatalog = () => {
    const q = catalogSearch.toLowerCase();
    const filteredProducts = products.filter(p =>
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.variants?.some((v: any) => v.size?.toLowerCase().includes(q) || String(v.gsm || '').includes(q))
    );
    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Input
        type="text"
        placeholder="Search products, variants, GSM..."
        value={catalogSearch}
        onChange={e => setCatalogSearch(e.target.value)}
      />
      {!showAddProduct ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Products & Variants</h3>
          {canManageCatalog && (
            <Button variant="primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddProduct(true)}>
              + Add Product
            </Button>
          )}
        </div>
      ) : (
        <Card style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-primary)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>New Product</h3>
          <Input type="text" placeholder="Product Name (e.g. Shade Net)" style={{ marginBottom: 'var(--space-3)' }} value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
          <Input type="text" placeholder="Description (Optional)" style={{ marginBottom: 'var(--space-4)' }} value={newProductDesc} onChange={(e) => setNewProductDesc(e.target.value)} />
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Cancel</Button>
            <Button variant="primary" style={{ flex: 1 }} onClick={handleAddProduct}>Save Product</Button>
          </div>
        </Card>
      )}

      {filteredProducts.length === 0 && q && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No products match "{catalogSearch}"</p>
      )}
      {filteredProducts.map((product) => (
        <Card key={product.id} style={{ padding: 'var(--space-4)', opacity: product.isActive ? 1 : 0.6 }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            {editingProductId === product.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Input type="text" value={editProductName} onChange={e => setEditProductName(e.target.value)} placeholder="Product name" autoFocus />
                <Input type="text" value={editProductDesc} onChange={e => setEditProductDesc(e.target.value)} placeholder="Description (optional)" />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setEditingProductId(null)}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => handleSaveProduct(product.id)}>Save</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{product.name}</strong>
                    {!product.isActive && <Badge status="completed">Disabled</Badge>}
                  </div>
                  {product.description && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{product.description}</div>}
                </div>
                {canManageCatalog && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <Button variant="outline" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => { setEditingProductId(product.id); setEditProductName(product.name); setEditProductDesc(product.description || ''); }}>Edit</Button>
                    <Button variant={product.isActive ? 'outline' : 'primary'} style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => toggleProductStatus(product.id)}>{product.isActive ? 'Disable' : 'Enable'}</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {product.variants && product.variants.map((v: any, i: number) => (
            <div key={v.id || i} style={{ background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', overflow: 'hidden' }}>
              {editingVariant?.variantId === v.id ? (
                <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>GSM</div>
                      <select className="input-field" value={editVariantData.gsm} onChange={e => setEditVariantData(d => ({ ...d, gsm: e.target.value }))} style={{ width: '100%', fontSize: '0.85rem' }} autoFocus>
                        <option value="">Select GSM</option>
                        {gsmList.filter((g: any) => g.isActive).map((g: any) => (
                          <option key={g.id} value={String(g.value)}>{g.value} GSM{g.label ? ` — ${g.label}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Size</div>
                      <Input placeholder="e.g. 30x60" value={editVariantData.size} onChange={e => setEditVariantData(d => ({ ...d, size: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Rate (₹ per kg)</div>
                      <Input placeholder="e.g. 210" type="number" value={editVariantData.rate} onChange={e => setEditVariantData(d => ({ ...d, rate: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Pieces / bundle</div>
                      <Input placeholder="e.g. 50" type="number" value={editVariantData.pieces} onChange={e => setEditVariantData(d => ({ ...d, pieces: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setEditingVariant(null)}>Cancel</Button>
                    <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={handleSaveVariant}>Save</Button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>{v.gsm ? `${v.gsm} GSM` : ''}{v.gsm && v.size ? ' • ' : ''}{v.size || ''}{v.noOfPieces ? ` • ${v.noOfPieces} pcs/bundle` : ''}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong style={{ fontSize: '0.85rem' }}>₹{v.rateOverride}</strong>
                    {canManageCatalog && v.id && (
                      <button onClick={() => { setEditingVariant({ productId: product.id, variantId: v.id }); setEditVariantData({ gsm: String(v.gsm || ''), size: v.size || '', rate: String(v.rateOverride || ''), pieces: String(v.noOfPieces || '') }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', padding: '2px 4px' }} title="Edit variant">✎</button>
                    )}
                    {canDelete && v.id && (
                      <button onClick={() => setConfirmDelete({ type: 'variant', productId: product.id, variantId: v.id, label: v.size })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fa5252', fontSize: '0.75rem', padding: '2px 4px', lineHeight: 1 }} title="Remove">✕</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {canManageCatalog && (
            addingVariantForProductId === product.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>GSM</div>
                    <select className="input-field" value={newVariantGsm} onChange={e => setNewVariantGsm(e.target.value)} style={{ width: '100%', fontSize: '0.85rem' }}>
                      <option value="">Select GSM</option>
                      {gsmList.filter((g: any) => g.isActive).map((g: any) => (
                        <option key={g.id} value={String(g.value)}>{g.value} GSM{g.label ? ` — ${g.label}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Size *</div>
                    <Input placeholder="e.g. 30x60" value={newVariantSize} onChange={e => setNewVariantSize(e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Rate (₹ per kg) *</div>
                    <Input placeholder="e.g. 210" type="number" value={newVariantRate} onChange={e => setNewVariantRate(e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Pieces / bundle</div>
                    <Input placeholder="e.g. 50" type="number" value={newVariantPieces} onChange={e => setNewVariantPieces(e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setAddingVariantForProductId(null)}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => handleAddVariant(product.id)}>Save</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" style={{ width: '100%', borderStyle: 'dashed', fontSize: '0.8rem', padding: 'var(--space-1)' }} onClick={() => { setAddingVariantForProductId(product.id); setNewVariantGsm(''); setNewVariantSize(''); setNewVariantRate(''); setNewVariantPieces(''); }}>
                + Add Price Record
              </Button>
            )
          )}
        </Card>
      ))}
    </div>
    );
  };

  const renderRawMaterialsCatalog = () => {
    const q = catalogSearch.toLowerCase();
    const filteredRmTypes = rawMaterialTypes.filter((t: any) =>
      !q ||
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.variants?.some((v: any) =>
        v.spec?.toLowerCase().includes(q) || String(v.gsm || '').includes(q)
      )
    );
    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Input
        type="text"
        placeholder="Search rolls, GSM, size..."
        value={catalogSearch}
        onChange={e => setCatalogSearch(e.target.value)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Rolls Godown</h3>
        {canManageCatalog && !showAddRmType && (
          <Button variant="primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddRmType(true)}>
            + Add Roll Type
          </Button>
        )}
      </div>

      {showAddRmType && (
        <Card style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-primary)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>New Raw Material Type</h3>
          <Input type="text" placeholder="Name (e.g. HDPE Tape, PP Flat Yarn)" style={{ marginBottom: 'var(--space-3)' }} value={newRmName} onChange={(e) => setNewRmName(e.target.value)} autoFocus />
          <Input type="text" placeholder="Description (Optional)" style={{ marginBottom: 'var(--space-4)' }} value={newRmDesc} onChange={(e) => setNewRmDesc(e.target.value)} />
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => { setShowAddRmType(false); setNewRmName(''); setNewRmDesc(''); }}>Cancel</Button>
            <Button variant="primary" style={{ flex: 1 }} onClick={handleAddRmType}>Save</Button>
          </div>
        </Card>
      )}

      {filteredRmTypes.length === 0 && q && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No rolls match "{catalogSearch}"</p>
      )}
      {filteredRmTypes.map((rmType: any) => (
        <Card key={rmType.id} style={{ padding: 'var(--space-4)', opacity: rmType.isActive ? 1 : 0.6 }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            {editingRmTypeId === rmType.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Input type="text" value={editRmName} onChange={e => setEditRmName(e.target.value)} placeholder="Type name" autoFocus />
                <Input type="text" value={editRmDesc} onChange={e => setEditRmDesc(e.target.value)} placeholder="Description (optional)" />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setEditingRmTypeId(null)}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => handleSaveRmType(rmType.id)}>Save</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{rmType.name}</strong>
                    {!rmType.isActive && <Badge status="completed">Disabled</Badge>}
                  </div>
                  {rmType.description && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{rmType.description}</div>}
                </div>
                {canManageCatalog && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <Button variant="outline" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => { setEditingRmTypeId(rmType.id); setEditRmName(rmType.name); setEditRmDesc(rmType.description || ''); }}>Edit</Button>
                    <Button variant={rmType.isActive ? 'outline' : 'primary'} style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => toggleRmTypeStatus(rmType.id)}>{rmType.isActive ? 'Disable' : 'Enable'}</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {rmType.variants && rmType.variants.map((v: any, i: number) => (
            <div key={v.id || i} style={{ background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', overflow: 'hidden' }}>
              {editingRmVariant?.variantId === v.id ? (
                <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <select className="input-field" value={editRmVariantData.gsm} onChange={e => setEditRmVariantData(d => ({ ...d, gsm: e.target.value }))} style={{ flex: 1, fontSize: '0.85rem' }} autoFocus>
                      <option value="">GSM...</option>
                      {gsmList.filter((g: any) => g.isActive).map((g: any) => (
                        <option key={g.id} value={String(g.value)}>{g.value} GSM</option>
                      ))}
                    </select>
                    <Input placeholder="Spec (e.g. 3cm flat)" value={editRmVariantData.spec} onChange={e => setEditRmVariantData(d => ({ ...d, spec: e.target.value }))} style={{ flex: 1 }} />
                    <Input placeholder="Wt/roll (kg)" type="number" value={editRmVariantData.weight} onChange={e => setEditRmVariantData(d => ({ ...d, weight: e.target.value }))} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setEditingRmVariant(null)}>Cancel</Button>
                    <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={handleSaveRmVariant}>Save</Button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>
                    {v.gsm ? `${v.gsm} GSM` : ''}
                    {v.spec ? (v.gsm ? ` • ${v.spec}` : v.spec) : ''}
                    {v.weightPerRollKg ? ` • ${v.weightPerRollKg}kg/roll` : ''}
                    {!v.gsm && !v.spec ? 'Unspecified' : ''}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {canManageCatalog && v.id && (
                      <button onClick={() => { setEditingRmVariant({ typeId: rmType.id, variantId: v.id }); setEditRmVariantData({ gsm: String(v.gsm || ''), spec: v.spec || '', weight: String(v.weightPerRollKg || '') }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', padding: '2px 4px' }} title="Edit">✎</button>
                    )}
                    {canDelete && v.id && (
                      <button onClick={() => setConfirmDeleteRmVariant({ typeId: rmType.id, variantId: v.id, label: v.gsm ? `${v.gsm} GSM` : 'variant' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fa5252', fontSize: '0.75rem', padding: '2px 4px', lineHeight: 1 }} title="Remove">✕</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {canManageCatalog && (
            addingVariantForRmTypeId === rmType.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <select className="input-field" value={newRmVariantGsm} onChange={e => setNewRmVariantGsm(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }}>
                    <option value="">GSM...</option>
                    {gsmList.filter((g: any) => g.isActive).map((g: any) => (
                      <option key={g.id} value={String(g.value)}>{g.value} GSM</option>
                    ))}
                  </select>
                  <Input placeholder="Spec (e.g. 3cm flat)" value={newRmVariantSpec} onChange={e => setNewRmVariantSpec(e.target.value)} style={{ flex: 1 }} />
                  <Input placeholder="Wt/roll (kg)" type="number" value={newRmVariantWeight} onChange={e => setNewRmVariantWeight(e.target.value)} style={{ flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => { setAddingVariantForRmTypeId(null); setNewRmVariantGsm(''); setNewRmVariantSpec(''); setNewRmVariantWeight(''); }}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => handleAddRmVariant(rmType.id)}>Save</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" style={{ width: '100%', borderStyle: 'dashed', fontSize: '0.8rem', padding: 'var(--space-1)' }} onClick={() => { setAddingVariantForRmTypeId(rmType.id); setNewRmVariantGsm(''); setNewRmVariantSpec(''); setNewRmVariantWeight(''); }}>
                + Add Variant
              </Button>
            )
          )}
        </Card>
      ))}

      {rawMaterialTypes.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>No rolls defined yet.</p>
      )}
    </div>
    );
  };

  const renderWhatsAppTab = () => {
    if (config.WHATSAPP_TYPE === 'msg91') {
      return (
        <Card style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>WhatsApp — MSG91</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            <p style={{ margin: 0 }}>Provider is set to <strong>MSG91</strong>. Messages are sent via the MSG91 API using pre-approved WhatsApp Business templates.</p>
            <p style={{ margin: 0 }}>No QR scan required. Configure <code>msg91.auth-key</code> and template names in <code>application.properties</code> on the server.</p>
          </div>
        </Card>
      );
    }

    return (
      <Card style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <h3 style={{ margin: 0 }}>WhatsApp Connection</h3>
          <Button variant="outline" style={{ fontSize: '0.8rem', padding: '4px 12px' }} onClick={fetchWaStatus}>
            Refresh
          </Button>
        </div>

        {waStatus === 'loading' && (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>Checking connection...</p>
        )}

        {waStatus === 'connected' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-6)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e6f9f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#2f9e44' }}>✓</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2f9e44' }}>WhatsApp Connected</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                Order updates and OTPs will be sent from the linked admin account.
              </div>
            </div>
            <Button
              variant="outline"
              style={{ color: '#fa5252', borderColor: '#fa5252', fontSize: '0.85rem' }}
              onClick={async () => {
                if (!window.confirm('Disconnect WhatsApp? You will need to scan a new QR code to reconnect.')) return;
                try {
                  const tokenParam = config.WHATSAPP_ADMIN_TOKEN ? `?token=${config.WHATSAPP_ADMIN_TOKEN}` : '';
                  await fetch(`${config.WHATSAPP_WEB_URL}/logout${tokenParam}`, { method: 'POST' });
                  setWaStatus('loading');
                  setTimeout(fetchWaStatus, 2500);
                } catch (e) {
                  console.error('Logout failed', e);
                }
              }}
            >
              Disconnect &amp; Scan New Number
            </Button>
          </div>
        )}

        {waStatus === 'qr_pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 320 }}>
              Open WhatsApp on your phone → <strong>Linked Devices</strong> → <strong>Link a Device</strong>, then scan this QR code.
            </p>
            {waQr ? (
              <img src={waQr} alt="WhatsApp QR Code" style={{ width: 240, height: 240, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            ) : (
              <div style={{ width: 240, height: 240, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Loading QR...
              </div>
            )}
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              QR refreshes automatically every 5 seconds. Once scanned, this page will show Connected.
            </p>
          </div>
        )}

        {waStatus === 'disconnected' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-6)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#fa5252' }}>!</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fa5252' }}>Service Unreachable</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                WhatsApp service is offline. Make sure it is running and try again.
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="page-content">
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Remove Pricing Record?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Are you sure you want to remove <strong>{confirmDelete.label}</strong>?</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleDeleteVariant}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteUserId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Delete User?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Permanently delete <strong>{confirmDeleteUserId.name}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteUserId(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleDeleteUser}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteRmVariant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Remove Variant?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Remove <strong>{confirmDeleteRmVariant.label}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteRmVariant(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleDeleteRmVariant}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>
        Superadmin Panel
      </h2>

      <SegmentedControl
        options={[
          { label: 'Catalog', value: 'catalog' },
          ...(canManageUsers ? [{ label: 'Users & Access', value: 'users' }] : []),
          { label: 'Masters', value: 'masters' },
          ...(canManageUsers && config.WHATSAPP_TYPE !== 'none' ? [{ label: 'WhatsApp', value: 'whatsapp' }] : []),
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 'var(--space-6)' }}>
        {tab === 'catalog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => { setCatalogView('products'); setCatalogSearch(''); }}
                style={{ padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid', fontSize: '0.85rem', cursor: 'pointer', fontWeight: catalogView === 'products' ? 600 : 400, background: catalogView === 'products' ? 'var(--color-primary)' : 'transparent', color: catalogView === 'products' ? 'white' : 'var(--color-text-muted)', borderColor: catalogView === 'products' ? 'var(--color-primary)' : 'var(--color-border)' }}
              >
                Products
              </button>
              <button
                onClick={() => { setCatalogView('rawMaterials'); setCatalogSearch(''); }}
                style={{ padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid', fontSize: '0.85rem', cursor: 'pointer', fontWeight: catalogView === 'rawMaterials' ? 600 : 400, background: catalogView === 'rawMaterials' ? 'var(--color-primary)' : 'transparent', color: catalogView === 'rawMaterials' ? 'white' : 'var(--color-text-muted)', borderColor: catalogView === 'rawMaterials' ? 'var(--color-primary)' : 'var(--color-border)' }}
              >
                Rolls Godown
              </button>
            </div>
            {catalogView === 'products' ? renderProductsCatalog() : renderRawMaterialsCatalog()}
          </div>
        )}

        {tab === 'users' && renderUsersTab()}

        {tab === 'whatsapp' && renderWhatsAppTab()}

        {tab === 'masters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ margin: 0 }}>GSM Values</h3>
                {canManageCatalog && !showAddGsm && (
                  <Button variant="primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddGsm(true)}>+ Add</Button>
                )}
              </div>
              {showAddGsm && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <Input type="number" placeholder="GSM value (e.g. 110)" value={newGsmValue} onChange={e => setNewGsmValue(e.target.value)} style={{ flex: '1 1 100px' }} autoFocus />
                  <Input type="text" placeholder="Label (optional)" value={newGsmLabel} onChange={e => setNewGsmLabel(e.target.value)} style={{ flex: '2 1 150px' }} />
                  <Button variant="outline" style={{ fontSize: '0.8rem' }} onClick={() => { setShowAddGsm(false); setNewGsmValue(''); setNewGsmLabel(''); }}>Cancel</Button>
                  <Button variant="primary" style={{ fontSize: '0.8rem' }} onClick={handleAddGsm}>Save</Button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {gsmList.map((g: any) => (
                  <div key={g.id} style={{ padding: 'var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', opacity: g.isActive ? 1 : 0.5 }}>
                    {editingGsmId === g.id ? (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <Input type="number" value={editGsmValue} onChange={e => setEditGsmValue(e.target.value)} style={{ flex: '1 1 80px' }} autoFocus />
                        <Input type="text" value={editGsmLabel} onChange={e => setEditGsmLabel(e.target.value)} placeholder="Label (optional)" style={{ flex: '2 1 140px' }} />
                        <Button variant="outline" style={{ fontSize: '0.8rem' }} onClick={() => setEditingGsmId(null)}>Cancel</Button>
                        <Button variant="primary" style={{ fontSize: '0.8rem' }} onClick={() => handleSaveGsm(g.id)}>Save</Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{g.value} GSM</span>
                          {g.label && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>{g.label}</span>}
                          {!g.isActive && <span style={{ fontSize: '0.75rem', color: '#fa5252', marginLeft: 'var(--space-2)' }}>Disabled</span>}
                        </div>
                        {canManageCatalog && (
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button onClick={() => { setEditingGsmId(g.id); setEditGsmValue(String(g.value)); setEditGsmLabel(g.label || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', padding: '2px 4px' }}>✎</button>
                            <button onClick={() => handleDeleteGsm(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fa5252', fontSize: '0.75rem', padding: '2px 4px' }}>✕</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {gsmList.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>No GSM values configured yet.</p>}
              </div>
            </Card>

            <Card>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>Order Statuses</h3>
              {orderStatuses.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Loading...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {orderStatuses.map((s: any) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</span>
                        {s.description && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>— {s.description}</span>}
                      </div>
                      <Badge status="completed" style={{ fontSize: '0.7rem' }}>#{s.sequence}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};
