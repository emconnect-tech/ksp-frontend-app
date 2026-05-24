import { useState, useEffect } from 'react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { config } from '../config';

export const AdminSettings = () => {
  const [tab, setTab] = useState('catalog');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const { token } = useAuth();
  const { canDelete, canManageCatalog } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // Live State for Products
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Live State for Users
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Live State for Statuses
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);

  // Live State for GSM Master
  const [gsmList, setGsmList] = useState<any[]>([]);
  const [newGsmValue, setNewGsmValue] = useState('');
  const [newGsmLabel, setNewGsmLabel] = useState('');
  const [showAddGsm, setShowAddGsm] = useState(false);
  const [editingGsmId, setEditingGsmId] = useState<string | null>(null);
  const [editGsmValue, setEditGsmValue] = useState('');
  const [editGsmLabel, setEditGsmLabel] = useState('');

  useEffect(() => {
    if (tab === 'users') {
      fetchUsers();
    } else if (tab === 'catalog') {
      fetchProducts();
    } else if (tab === 'masters') {
      fetchStatuses();
      fetchGsmList();
    }
  }, [tab, searchQuery]);

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
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Failed to fetch products', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchUsers = async () => {
    try {
      let urlStr = `${API_BASE_URL}/api/v1/users`;
      if (searchQuery.trim()) {
        urlStr += `?search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(urlStr, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
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
  const [newVariantWeight, setNewVariantWeight] = useState('');

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductDesc, setEditProductDesc] = useState('');

  const [editingVariant, setEditingVariant] = useState<{ productId: string; variantId: string } | null>(null);
  const [editVariantData, setEditVariantData] = useState({ gsm: '', size: '', rate: '', weight: '' });

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
      if (res.ok) {
        setEditingProductId(null);
        fetchProducts();
      } else {
        alert('Failed to update product');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update product');
    }
  };

  const handleSaveVariant = async () => {
    if (!editingVariant) return;
    const { productId, variantId } = editingVariant;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gsm: editVariantData.gsm ? parseInt(editVariantData.gsm) : null,
          size: editVariantData.size || null,
          rateOverride: editVariantData.rate ? parseFloat(editVariantData.rate) : null,
          weightPerBundleKg: editVariantData.weight ? parseFloat(editVariantData.weight) : null,
        }),
      });
      if (res.ok) {
        setEditingVariant(null);
        fetchProducts();
      } else {
        alert('Failed to update variant');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update variant');
    }
  };

  const handleAddVariant = async (productId: string) => {
    if (!newVariantRate.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gsm: newVariantGsm ? parseInt(newVariantGsm) : null,
          size: newVariantSize || null,
          rateOverride: parseFloat(newVariantRate),
          weightPerBundleKg: newVariantWeight ? parseFloat(newVariantWeight) : null,
        })
      });
      if (res.ok) {
        setAddingVariantForProductId(null);
        setNewVariantGsm('');
        setNewVariantSize('');
        setNewVariantRate('');
        setNewVariantWeight('');
        fetchProducts();
      }
    } catch (e) {
      console.error('Failed to add variant', e);
    }
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
      console.error('Failed to toggle product status', e);
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
        setNewProductName('');
        setNewProductDesc('');
        setShowAddProduct(false);
        fetchProducts();
      } else {
        console.error('Failed to create product');
      }
    } catch (e) {
      console.error('Error creating product', e);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (e) {
      fetchUsers(); // revert on fail
    }
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
    } catch (e) {
      fetchUsers(); // revert on fail
    }
  };

  const renderUsersTab = () => {
    return (
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
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      fontWeight: 600, 
                      color: 'var(--color-primary)', 
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      outline: 'none',
                      fontSize: '0.85rem'
                    }}
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
                  status={
                    user.status === 'ACTIVE' || user.status === 'Approved' ? 'completed' : 
                    user.status === 'PENDING' || user.status === 'Pending' ? 'ongoing' : 
                    'ongoing' 
                  }
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
  };

  return (
    <div className="page-content">
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Remove Pricing Record?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Are you sure you want to remove <strong>{confirmDelete.label}</strong>? This cannot be undone.
            </p>
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
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Are you sure you want to permanently delete <strong>{confirmDeleteUserId.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteUserId(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleDeleteUser}>Delete</Button>
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
          { label: 'Users & Access', value: 'users' },
          { label: 'Masters', value: 'masters' }
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 'var(--space-6)' }}>
        {tab === 'catalog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                <Input 
                  type="text" 
                  placeholder="Product Name (e.g. Shade Net)" 
                  style={{ marginBottom: 'var(--space-3)' }}
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />
                <Input 
                  type="text" 
                  placeholder="Description (Optional)" 
                  style={{ marginBottom: 'var(--space-4)' }}
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={handleAddProduct}>Save Product</Button>
                </div>
              </Card>
            )}

            {products.map((product) => (
              <Card key={product.id} style={{ padding: 'var(--space-4)', opacity: product.isActive ? 1 : 0.6 }}>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  {editingProductId === product.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <Input
                        type="text"
                        value={editProductName}
                        onChange={e => setEditProductName(e.target.value)}
                        placeholder="Product name"
                        autoFocus
                      />
                      <Input
                        type="text"
                        value={editProductDesc}
                        onChange={e => setEditProductDesc(e.target.value)}
                        placeholder="Description (optional)"
                      />
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
                        {product.description && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{product.description}</div>
                        )}
                      </div>
                      {canManageCatalog && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                          <Button
                            variant="outline"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => { setEditingProductId(product.id); setEditProductName(product.name); setEditProductDesc(product.description || ''); }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={product.isActive ? "outline" : "primary"}
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => toggleProductStatus(product.id)}
                          >
                            {product.isActive ? 'Disable' : 'Enable'}
                          </Button>
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
                          <select className="input-field" value={editVariantData.gsm} onChange={e => setEditVariantData(d => ({ ...d, gsm: e.target.value }))} style={{ flex: 1, fontSize: '0.85rem' }} autoFocus>
                            <option value="">GSM...</option>
                            {gsmList.filter((g: any) => g.isActive).map((g: any) => (
                              <option key={g.id} value={String(g.value)}>{g.value} GSM{g.label ? ` — ${g.label}` : ''}</option>
                            ))}
                          </select>
                          <Input placeholder="Size (e.g. 30x60)" value={editVariantData.size} onChange={e => setEditVariantData(d => ({ ...d, size: e.target.value }))} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <Input placeholder="Rate (₹)" type="number" value={editVariantData.rate} onChange={e => setEditVariantData(d => ({ ...d, rate: e.target.value }))} style={{ flex: 1 }} />
                          <Input placeholder="Wt/bundle (kg)" type="number" value={editVariantData.weight} onChange={e => setEditVariantData(d => ({ ...d, weight: e.target.value }))} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setEditingVariant(null)}>Cancel</Button>
                          <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={handleSaveVariant}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem' }}>{v.gsm ? `${v.gsm} GSM` : ''}{v.gsm && v.size ? ' • ' : ''}{v.size || ''}{v.weightPerBundleKg ? ` • ${v.weightPerBundleKg}kg/bundle` : ''}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <strong style={{ fontSize: '0.85rem' }}>₹{v.rateOverride}</strong>
                          {canManageCatalog && v.id && (
                            <button
                              onClick={() => { setEditingVariant({ productId: product.id, variantId: v.id }); setEditVariantData({ gsm: String(v.gsm || ''), size: v.size || '', rate: String(v.rateOverride || ''), weight: String(v.weightPerBundleKg || '') }); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.75rem', padding: '2px 4px' }}
                              title="Edit variant"
                            >
                              ✎
                            </button>
                          )}
                          {canDelete && v.id && (
                            <button
                              onClick={() => setConfirmDelete({ type: 'variant', productId: product.id, variantId: v.id, label: v.size })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fa5252', fontSize: '0.75rem', padding: '2px 4px', lineHeight: 1 }}
                              title="Remove pricing record"
                            >
                              ✕
                            </button>
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
                        <select className="input-field" value={newVariantGsm} onChange={e => setNewVariantGsm(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }}>
                          <option value="">GSM...</option>
                          {gsmList.filter((g: any) => g.isActive).map((g: any) => (
                            <option key={g.id} value={String(g.value)}>{g.value} GSM{g.label ? ` — ${g.label}` : ''}</option>
                          ))}
                        </select>
                        <Input placeholder="Size (e.g. 30x60)" value={newVariantSize} onChange={e => setNewVariantSize(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <Input placeholder="Rate (₹)" type="number" value={newVariantRate} onChange={e => setNewVariantRate(e.target.value)} style={{ flex: 1 }} />
                        <Input placeholder="Wt/bundle (kg)" type="number" value={newVariantWeight} onChange={e => setNewVariantWeight(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setAddingVariantForProductId(null)}>Cancel</Button>
                        <Button variant="primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => handleAddVariant(product.id)}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      style={{ width: '100%', borderStyle: 'dashed', fontSize: '0.8rem', padding: 'var(--space-1)' }}
                      onClick={() => { setAddingVariantForProductId(product.id); setNewVariantGsm(''); setNewVariantSize(''); setNewVariantRate(''); setNewVariantWeight(''); }}
                    >
                      + Add Price Record
                    </Button>
                  )
                )}
              </Card>
            ))}
          </div>
        )}

        {tab === 'users' && renderUsersTab()}

        {tab === 'masters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* GSM Master */}
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
