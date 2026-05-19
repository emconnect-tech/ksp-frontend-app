import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../design-system/components/ui/Card';
import { Button } from '../design-system/components/ui/Button';
import { Input } from '../design-system/components/ui/Input';
import { ArrowLeft, Edit2, Search, UserPlus } from 'lucide-react';
import { CustomerForm } from '../components/customers/CustomerForm';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { config } from '../config';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@example.com', address: '123, MG Road, Bangalore', totalOrders: 15 },
  { id: '2', name: 'Priya Sharma', phone: '8765432109', email: 'priya@example.com', address: '45, HSR Layout, Bangalore', totalOrders: 8 },
  { id: '3', name: 'Amit Singh', phone: '7654321098', email: 'amit@example.com', address: '78, Indiranagar, Bangalore', totalOrders: 22 },
];

export const Customers = () => {
  const [view, setView] = useState<'list' | 'view' | 'edit' | 'add'>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: string; name: string } | null>(null);
  const { token } = useAuth();
  const { canDelete } = usePermissions();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    if (config.USE_MOCK_API) {
      setCustomers(MOCK_CUSTOMERS);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // map backend structure to frontend structure
        const mapped = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phoneNumber,
          address: c.place,
          email: c.transportName,
          totalOrders: c.totalOrders ?? 0
        }));
        setCustomers(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch customers', e);
    }
  };

  const handleSaveCustomer = async (data: any) => {
    if (config.USE_MOCK_API) {
      handleBackToList();
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchCustomers();
        handleBackToList();
      }
    } catch (e) {
      console.error('Failed to create customer', e);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const fetchCustomerOrders = async (customerId: string) => {
    if (config.USE_MOCK_API) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/customers/${customerId}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCustomerOrders(await res.json());
    } catch (e) {
      console.error('Failed to fetch customer orders', e);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    fetchCustomerOrders(customer.id);
    setView('view');
  };

  const handleDeleteCustomer = async () => {
    if (!confirmDeleteId) return;
    const { id } = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        handleBackToList();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete customer');
      }
    } catch (e) {
      alert('Failed to delete customer');
    }
  };

  const handleEditCustomer = () => {
    setView('edit');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedCustomer(null);
  };

  const handleAddCustomer = () => {
    setView('add');
  };

  if (view === 'list') {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Customers</h2>
          <Button 
            variant="primary" 
            onClick={handleAddCustomer}
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <UserPlus size={18} />
            Add Customer
          </Button>
        </div>

        <div style={{ position: 'relative', marginBottom: 'var(--space-6)' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={18} />
          <Input 
            placeholder="Search by name or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredCustomers.map(customer => (
            <Card key={customer.id} onClick={() => handleViewCustomer(customer)} style={{ cursor: 'pointer', padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1.05rem' }}>{customer.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{customer.phone}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>{customer.totalOrders} Orders</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>View Details</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'view' && selectedCustomer) {
    return (
      <div className="page-content">
        {confirmDeleteId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
            <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
              <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Delete Customer?</h3>
              <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Permanently delete <strong>{confirmDeleteId.name}</strong>? Customers with existing orders cannot be deleted.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleDeleteCustomer}>Delete</Button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <button onClick={handleBackToList} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Customer Profile</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="outline" onClick={handleEditCustomer} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Edit2 size={16} /> Edit
            </Button>
            {canDelete && (
              <Button variant="outline" onClick={() => setConfirmDeleteId({ id: selectedCustomer.id, name: selectedCustomer.name })} style={{ padding: '6px 12px', color: '#fa5252', borderColor: '#fa5252' }}>
                Delete
              </Button>
            )}
          </div>
        </div>

        <Card style={{ padding: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{ width: '80px', height: '80px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-pill)', margin: '0 auto var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: '2rem', fontWeight: 'bold' }}>
              {selectedCustomer.name.charAt(0)}
            </div>
            <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: '1.5rem' }}>{selectedCustomer.name}</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{customerOrders.length} order{customerOrders.length !== 1 ? 's' : ''}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
              <div style={{ fontWeight: 500 }}>+91 {selectedCustomer.phone}</div>
            </div>
            {selectedCustomer.email && (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Transport / Email</label>
                <div style={{ fontWeight: 500 }}>{selectedCustomer.email}</div>
              </div>
            )}
            {selectedCustomer.address && (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Place / Address</label>
                <div style={{ fontWeight: 500 }}>{selectedCustomer.address}</div>
              </div>
            )}
          </div>
        </Card>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Orders ({customerOrders.length})</h4>
          {customerOrders.length === 0 ? (
            <Card style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No orders found for this customer.
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {customerOrders.map((order: any) => (
                <Card key={order.id} onClick={() => navigate(`/bookings?id=${order.id}`)} style={{ padding: 'var(--space-4)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{order.orderNumber}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        {order.totalWeightKg ? ` • ${order.totalWeightKg} kg` : ''}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        ₹{(order.totalAmount || 0).toLocaleString()}
                      </div>
                      {order.statusName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{order.statusName}</div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'edit' && selectedCustomer) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <button onClick={() => setView('view')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Customer</h2>
        </div>

        <Card style={{ padding: 'var(--space-6)' }}>
          <CustomerForm 
            initialData={selectedCustomer}
            onSubmit={() => setView('view')}
            onCancel={() => setView('view')}
            submitLabel="Save Changes"
          />
        </Card>
      </div>
    );
  }

  if (view === 'add') {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <button onClick={handleBackToList} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>New Customer</h2>
        </div>

        <Card style={{ padding: 'var(--space-6)' }}>
          <CustomerForm 
            onSubmit={handleSaveCustomer}
            onCancel={handleBackToList}
            submitLabel="Create Customer"
          />
        </Card>
      </div>
    );
  }

  return null;
};
