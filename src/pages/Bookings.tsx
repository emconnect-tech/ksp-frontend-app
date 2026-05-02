import { useState } from 'react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';

// Mock Data with specific phases
const mockOrders = [
  { id: '1042', customer: 'Planet Agro', items: 50, amount: '₹12,500', phase: 'Quotation Generated', action: 'Upload Bill', date: '2026-05-02' },
  { id: '1043', customer: 'Tarpoline Pro', items: 20, amount: '₹8,200', phase: 'Bill Uploaded', action: 'Upload Dispatch Photo', date: '2026-05-02' },
  { id: '1044', customer: 'ABC Farm', items: 10, amount: '₹4,000', phase: 'Dispatched', action: 'Upload LR Photo', date: '2026-05-01' },
];

export const Bookings = () => {
  const [tab, setTab] = useState('ongoing');
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  // Renders the list of orders based on the selected tab
  const renderList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {mockOrders.map((order) => (
          <Card key={order.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Order #{order.id}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {order.customer} • {order.items} Bundles
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 600 }}>
                  {order.amount}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge status="ongoing" style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-main)' }}>{order.phase}</Badge>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{order.date}</p>
              </div>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
            
            <Button variant="primary" style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }}>
              Action: {order.action}
            </Button>
          </Card>
        ))}
      </div>
    );
  };

  // Renders the Create Order Wizard
  const renderWizard = () => {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Create Booking</h2>
          <Badge status="upcoming">Step {wizardStep} of 3</Badge>
        </div>

        {wizardStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Select Customer</label>
              <select className="input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="" disabled>Choose a customer...</option>
                <option value="planet_agro">Planet Agro</option>
                <option value="abc_farm">ABC Farm</option>
                <option value="new">+ Add New Customer...</option>
              </select>
            </div>
            
            {selectedCustomer === 'new' && (
              <Card style={{ background: 'var(--color-surface-muted)', border: 'none', padding: 'var(--space-4)' }}>
                <h4 style={{ margin: '0 0 var(--space-4) 0' }}>New Customer Details</h4>
                <Input type="text" placeholder="Customer Name" style={{ marginBottom: 'var(--space-3)' }} />
                <Input type="tel" placeholder="Phone Number" style={{ marginBottom: 'var(--space-3)' }} />
                <textarea className="input-field" placeholder="Shipping Address..." rows={2} style={{ resize: 'vertical' }}></textarea>
              </Card>
            )}

            <Button variant="primary" onClick={() => setWizardStep(2)} disabled={!selectedCustomer}>
              Next: Select Items
            </Button>
          </div>
        )}

        {wizardStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <div className="grid-layout" style={{ marginBottom: 'var(--space-3)' }}>
                <select className="input-field"><option>Green Net 110GSM (30x60)</option></select>
                <Input type="number" placeholder="Qty" defaultValue={1} />
              </div>
              <Button variant="outline" style={{ width: '100%' }}>+ Add Another Item</Button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" onClick={() => setWizardStep(1)} style={{ flex: 1 }}>Back</Button>
              <Button variant="primary" onClick={() => setWizardStep(3)} style={{ flex: 2 }}>Next: Generate Quote</Button>
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-surface-muted)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 var(--space-2) 0' }}>Quotation Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Green Net (x1)</span>
                <span>₹2,500</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-3) 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span>Total</span>
                <span>₹2,500</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" onClick={() => setWizardStep(2)} style={{ flex: 1 }}>Back</Button>
              <Button variant="primary" onClick={() => { setWizardStep(1); setTab('ongoing'); }} style={{ flex: 2 }}>Confirm Booking</Button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="page-content">
      <SegmentedControl 
        options={[
          { label: 'Ongoing', value: 'ongoing' },
          { label: 'Completed', value: 'completed' },
          { label: '+ New', value: 'new' }
        ]} 
        value={tab} 
        onChange={(val) => { setTab(val); setWizardStep(1); }} 
      />

      <div style={{ marginTop: 'var(--space-6)' }}>
        {tab === 'new' ? renderWizard() : renderList()}
      </div>
    </div>
  );
};
