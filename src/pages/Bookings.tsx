import { useState, useRef } from 'react';
import { ArrowLeft, RotateCcw, FileText, Calendar, User, Package } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { CustomerForm } from '../components/customers/CustomerForm';

// Lifecycle Phases
const PHASES = [
  { phase: 'Quotation Generated', action: 'Upload Bill' },
  { phase: 'Bill Uploaded', action: 'Upload Dispatch Photo' },
  { phase: 'Dispatched', action: 'Upload LR Photo' },
  { phase: 'Completed', action: null }
];

const INITIAL_ORDERS = [
  { 
    id: '1042', customer: 'Planet Agro', items: 50, amount: '₹12,500', phase: 'Quotation Generated', action: 'Upload Bill', date: '2026-05-02',
    itemsList: [
      { name: 'Green Net 110GSM (30x60)', qty: 30, price: 250 },
      { name: 'Safety Net 140GSM (10x50)', qty: 20, price: 250 }
    ]
  },
  { 
    id: '1043', customer: 'Tarpoline Pro', items: 20, amount: '₹8,200', phase: 'Bill Uploaded', action: 'Upload Dispatch Photo', date: '2026-05-02',
    itemsList: [
      { name: 'Tarpoline 250GSM (20x20)', qty: 10, price: 410 },
      { name: 'Tarpoline 200GSM (15x15)', qty: 10, price: 410 }
    ]
  },
  { 
    id: '1044', customer: 'ABC Farm', items: 10, amount: '₹4,000', phase: 'Dispatched', action: 'Upload LR Photo', date: '2026-05-01',
    itemsList: [
      { name: 'Green Net 90GSM (50x100)', qty: 10, price: 400 }
    ]
  },
  { 
    id: '1046', customer: 'New Client Corp', items: 5, amount: '₹1,500', phase: 'Quotation Generated', action: 'Upload Bill', date: '2026-05-03',
    itemsList: [
      { name: 'Nylon Mesh (Roll)', qty: 5, price: 300 }
    ]
  },
  { 
    id: '1045', customer: 'Green Valley', items: 100, amount: '₹25,000', phase: 'Completed', action: null, date: '2026-04-30',
    itemsList: [
      { name: 'Premium Net 180GSM', qty: 100, price: 250 }
    ]
  },
];

export const Bookings = () => {
  const [tab, setTab] = useState('ongoing');
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setView('details');
  };

  const handleUndo = (orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const currentIdx = PHASES.findIndex(p => p.phase === order.phase);
      const prevPhase = PHASES[currentIdx - 1];
      
      if (prevPhase) {
        const updated = { ...order, phase: prevPhase.phase, action: prevPhase.action };
        if (selectedOrder?.id === orderId) setSelectedOrder(updated);
        return updated;
      }
      return order;
    }));
  };

  const handleButtonClick = (orderId: string) => {
    setActiveOrderId(orderId);
    setShowActionSheet(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeOrderId) {
      handleAction(activeOrderId);
      setActiveOrderId(null);
      setShowActionSheet(false);
      e.target.value = '';
    }
  };

  const handleAction = (orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const currentIdx = PHASES.findIndex(p => p.phase === order.phase);
      const nextPhase = PHASES[currentIdx + 1];
      
      if (nextPhase) {
        return { ...order, phase: nextPhase.phase, action: nextPhase.action };
      }
      return order;
    }));
  };

  // Renders the list of orders based on the selected tab
  const renderList = () => {
    const filteredOrders = orders.filter(o => 
      tab === 'ongoing' ? o.phase !== 'Completed' : o.phase === 'Completed'
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
          <Card 
            key={order.id} 
            onClick={() => handleViewDetails(order)}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', cursor: 'pointer' }}
          >
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
                <Badge status={order.phase === 'Completed' ? 'completed' : 'ongoing'} style={{ 
                  background: order.phase === 'Completed' ? 'var(--color-success-light)' : 'var(--color-surface-muted)', 
                  color: order.phase === 'Completed' ? 'var(--color-success)' : 'var(--color-text-main)' 
                }}>
                  {order.phase}
                </Badge>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{order.date}</p>
              </div>
            </div>
            
            {order.action && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
                <Button 
                  variant="primary" 
                  onClick={(e) => { e.stopPropagation(); handleButtonClick(order.id); }}
                  style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }}
                >
                  Action: {order.action}
                </Button>
              </>
            )}
          </Card>
        )) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
            No {tab} orders found.
          </div>
        )}
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedOrder) return null;
    const currentIdx = PHASES.findIndex(p => p.phase === selectedOrder.phase);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Order Details</h2>
        </div>

        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>#{selectedOrder.id}</h3>
            <Badge status={selectedOrder.phase === 'Completed' ? 'completed' : 'ongoing'}>
              {selectedOrder.phase}
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <User size={18} color="var(--color-text-muted)" />
              <div onClick={() => setShowCustomerModal(true)} style={{ cursor: 'pointer' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Customer</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px dashed var(--color-primary)' }}>{selectedOrder.customer}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Package size={18} color="var(--color-text-muted)" />
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Items</span>
                <span style={{ fontWeight: 600 }}>{selectedOrder.items} Bundles</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Calendar size={18} color="var(--color-text-muted)" />
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Order Date</span>
                <span style={{ fontWeight: 600 }}>{selectedOrder.date}</span>
              </div>
            </div>
          </div>
        </Card>

        <div>
          <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Package size={18} />
            Order Items & Pricing
          </h4>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              <span>Item Description</span>
              <span>Total</span>
            </div>
            {selectedOrder.itemsList?.map((item: any, idx: number) => (
              <div key={idx} style={{ padding: 'var(--space-4)', borderBottom: idx < selectedOrder.itemsList.length - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.qty} Bundles × ₹{item.price}</div>
                </div>
                <div style={{ fontWeight: 600 }}>₹{item.qty * item.price}</div>
              </div>
            ))}
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--color-border)' }}>
              <span style={{ fontWeight: 600 }}>Grand Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>{selectedOrder.amount}</span>
            </div>
          </Card>
        </div>

        <div>
          <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FileText size={18} />
            Workflow History
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingLeft: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {PHASES.map((p, i) => {
              const isCompleted = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isPending = i > currentIdx;

              return (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative' }}>
                  {/* Vertical Line */}
                  {i < PHASES.length - 1 && (
                    <div style={{ 
                      position: 'absolute', left: '7px', top: '24px', bottom: '-24px', 
                      width: '2px', 
                      background: isCompleted ? 'var(--color-primary)' : 'var(--color-border)',
                      zIndex: 0
                    }}></div>
                  )}

                  {/* Node */}
                  <div style={{ 
                    width: '16px', height: '16px', borderRadius: '50%', 
                    background: isPending ? 'white' : 'var(--color-primary)', 
                    border: isPending ? '2px solid var(--color-border)' : 'none',
                    marginTop: '4px', zIndex: 1,
                    boxShadow: isCurrent ? '0 0 0 4px var(--color-primary-light)' : 'none'
                  }}>
                    {isCompleted && (
                      <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '10px' }}>✓</div>
                    )}
                  </div>

                  <div style={{ opacity: isPending ? 0.5 : 1 }}>
                    <div style={{ 
                      fontWeight: 600, 
                      fontSize: '0.95rem', 
                      color: isCurrent ? 'var(--color-primary)' : 'inherit' 
                    }}>
                      {p.phase}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {isCompleted ? 'Completed on May 05' : isCurrent ? 'Waiting for action...' : 'Pending'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          {selectedOrder.action && (
            <Button variant="primary" onClick={() => handleButtonClick(selectedOrder.id)}>
              Continue: {selectedOrder.action}
            </Button>
          )}
          
          {currentIdx > 0 && (
            <Button variant="outline" onClick={() => handleUndo(selectedOrder.id)} style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
              <RotateCcw size={16} style={{ marginRight: '8px' }} />
              Undo Last Step
            </Button>
          )}
        </div>
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
                <CustomerForm 
                  isCompact 
                  onSubmit={() => setSelectedCustomer('')} 
                  onCancel={() => setSelectedCustomer('')}
                  submitLabel="Add & Select"
                />
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
      {/* Hidden inputs for different capture modes */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        style={{ display: 'none' }} 
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      {/* Customer Details Modal */}
      {showCustomerModal && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, top: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)'
        }} onClick={() => setShowCustomerModal(false)}>
          <Card style={{ width: '100%', maxWidth: '360px', padding: 'var(--space-6)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>Customer Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Name</label>
                <div style={{ fontWeight: 600 }}>{selectedOrder?.customer}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Phone</label>
                <div style={{ fontWeight: 600 }}>+91 9876543210</div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Shipping Address</label>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>123, Industrial Area Phase II, Bangalore, KA - 560001</div>
              </div>
            </div>
            <Button variant="primary" style={{ width: '100%', marginTop: 'var(--space-6)' }} onClick={() => setShowCustomerModal(false)}>
              Close
            </Button>
          </Card>
        </div>
      )}

      {/* Custom Action Sheet */}
      {showActionSheet && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, top: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end'
        }} onClick={() => setShowActionSheet(false)}>
          <div style={{
            width: '100%', background: 'white', 
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            padding: 'var(--space-6)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--space-6)', textAlign: 'center' }}>Complete Action</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Button variant="primary" style={{ padding: 'var(--space-4)' }} onClick={() => cameraInputRef.current?.click()}>
                📷 Take Photo (Camera)
              </Button>
              <Button variant="outline" style={{ padding: 'var(--space-4)' }} onClick={() => fileInputRef.current?.click()}>
                🖼️ Choose from Gallery / Files
              </Button>
              <Button variant="outline" style={{ marginTop: 'var(--space-2)', border: 'none' }} onClick={() => setShowActionSheet(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

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
        {view === 'details' ? renderDetails() : (tab === 'new' ? renderWizard() : renderList())}
      </div>
    </div>
  );
};
