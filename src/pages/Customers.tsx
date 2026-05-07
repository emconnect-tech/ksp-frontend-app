import { useState } from 'react';
import { Card } from '../design-system/components/ui/Card';
import { Button } from '../design-system/components/ui/Button';
import { Input } from '../design-system/components/ui/Input';
import { ArrowLeft, Edit2, Search, UserPlus } from 'lucide-react';
import { CustomerForm } from '../components/customers/CustomerForm';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
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

  const filteredCustomers = MOCK_CUSTOMERS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setView('view');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <button onClick={handleBackToList} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Customer Profile</h2>
          <Button 
            variant="outline" 
            onClick={handleEditCustomer}
            style={{ marginLeft: 'auto', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Edit2 size={16} />
            Edit
          </Button>
        </div>

        <Card style={{ padding: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{ 
              width: '80px', height: '80px', 
              background: 'var(--color-primary-light)', 
              borderRadius: 'var(--radius-pill)',
              margin: '0 auto var(--space-4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-primary)', fontSize: '2rem', fontWeight: 'bold'
            }}>
              {selectedCustomer.name.charAt(0)}
            </div>
            <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: '1.5rem' }}>{selectedCustomer.name}</h3>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Customer since Jan 2024</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
              <div style={{ fontWeight: 500 }}>+91 {selectedCustomer.phone}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Email Address</label>
              <div style={{ fontWeight: 500 }}>{selectedCustomer.email}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Delivery Address</label>
              <div style={{ fontWeight: 500 }}>{selectedCustomer.address}</div>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <h4 style={{ marginBottom: 'var(--space-4)' }}>Recent Orders</h4>
          <Card style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Order history will appear here.
          </Card>
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
            onSubmit={handleBackToList}
            onCancel={handleBackToList}
            submitLabel="Create Customer"
          />
        </Card>
      </div>
    );
  }

  return null;
};
