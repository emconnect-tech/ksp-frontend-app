import { useState, useEffect } from 'react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

export const AdminSettings = () => {
  const [tab, setTab] = useState('catalog');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // Mock State for Products
  const [products, setProducts] = useState([
    { id: 1, name: 'Green Net (Planet Agro)', active: true, gsmMin: 105, gsmMax: 115, variants: [{ size: '110 GSM • 30x60', price: 2500 }, { size: '90 GSM • 40x40', price: 3200 }] },
    { id: 2, name: 'Tarpaulin', active: true, gsmMin: 115, gsmMax: 125, variants: [{ size: '120 GSM • 50x50', price: 4500 }] },
    { id: 3, name: 'Mulch Film', active: false, gsmMin: 23, gsmMax: 27, variants: [{ size: '25 Micron • 400m', price: 1800 }] },
  ]);

  // Live State for Users
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (tab === 'users') {
      fetchUsers();
    }
  }, [tab, searchQuery]);

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

  const toggleProductStatus = (id: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p));
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
                <Button variant="primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddProduct(true)}>
                  + Add Product
                </Button>
              </div>
            ) : (
              <Card style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-primary)' }}>
                <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>New Product</h3>
                <Input type="text" placeholder="Product Name (e.g. Shade Net)" style={{ marginBottom: 'var(--space-3)' }} />
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>GSM Tolerance (± Range)</label>
                  <div className="grid-layout">
                    <Input type="number" placeholder="Min" />
                    <Input type="number" placeholder="Max" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Save Product</Button>
                </div>
              </Card>
            )}

            {products.map((product) => (
              <Card key={product.id} style={{ padding: 'var(--space-4)', opacity: product.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{product.name}</strong>
                      {!product.active && <Badge status="completed">Disabled</Badge>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>GSM Range:</span>
                      <Input type="number" defaultValue={product.gsmMin} style={{ width: '50px', padding: '2px 4px', fontSize: '0.8rem' }} />
                      <span>-</span>
                      <Input type="number" defaultValue={product.gsmMax} style={{ width: '50px', padding: '2px 4px', fontSize: '0.8rem' }} />
                    </div>
                  </div>
                  <Button
                    variant={product.active ? "outline" : "primary"}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    onClick={() => toggleProductStatus(product.id)}
                  >
                    {product.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                {product.variants.map((v, i) => (
                  <div key={i} style={{ background: 'var(--color-surface-muted)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>{v.size}</span>
                    <strong style={{ fontSize: '0.85rem' }}>₹{v.price}</strong>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  style={{ width: '100%', borderStyle: 'dashed', fontSize: '0.8rem', padding: 'var(--space-1)' }}
                >
                  + Add Price Record
                </Button>
              </Card>
            ))}
          </div>
        )}

        {tab === 'users' && renderUsersTab()}

        {tab === 'masters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>System Master Statuses</h3>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                <li>Quotation Generated</li>
                <li>Bill Uploaded</li>
                <li>Dispatched</li>
                <li>LR Uploaded</li>
                <li>Completed</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
