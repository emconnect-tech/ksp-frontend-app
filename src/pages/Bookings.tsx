import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, RotateCcw, FileText, Calendar, User, Package, Share2 } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { CustomerForm } from '../components/customers/CustomerForm';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { config } from '../config';
import { fetchOrders, createOrderAPI, updateOrderWeightsAPI, updateOrderStatusAPI, fetchOrderByIdAPI } from '../api';

// Lifecycle Phases
const PHASES = [
  { phase: 'Order Created', action: 'Add Weights' },
  { phase: 'Weights Added', action: 'Generate Quotation' },
  { phase: 'Quotation Generated', action: 'Upload Bill' },
  { phase: 'Bill Uploaded', action: 'Dispatch (Full/Partial)' },
  { phase: 'Partially Dispatched', action: 'Dispatch More (Full/Partial)' },
  { phase: 'Dispatched', action: 'Upload LR Photo' },
  { phase: 'Completed', action: null }
];

// Initial mock state removed


export const Bookings = () => {
  const [tab, setTab] = useState('ongoing');
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({}); // name -> id
  const { token } = useAuth();
  const { canDelete } = usePermissions();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    loadOrders();
    loadMasterData();
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    if (config.USE_MOCK_API) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/statuses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Array<{ id: string; name: string }> = await res.json();
        const map: Record<string, string> = {};
        data.forEach(s => { map[s.name] = s.id; });
        setStatusMap(map);
      }
    } catch (e) {
      console.error('Failed to load statuses', e);
    }
  };

  const loadMasterData = async () => {
    if (config.USE_MOCK_API) {
      setCustomersList([{ id: '11111111-1111-1111-1111-111111111111', name: 'Planet Agro (Mock)' }]);
      setProductsList([{ id: 'mock-prod-1', name: 'Green Net', variants: [{ id: '22222222-2222-2222-2222-222222222222', size: '110GSM', rateOverride: 210 }] }]);
      return;
    }
    try {
      const custRes = await fetch(`${API_BASE_URL}/api/v1/customers`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (custRes.ok) setCustomersList(await custRes.json());

      const prodRes = await fetch(`${API_BASE_URL}/api/v1/products`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (prodRes.ok) setProductsList(await prodRes.json());
    } catch (e) {
      console.error('Failed to load master data', e);
    }
  };

  const mapPhase = (statusName: string | null, totalWeightKg: number | null): { phase: string; action: string | null } => {
    switch (statusName) {
      case 'CONFIRMED':    return { phase: 'Bill Uploaded',      action: 'Dispatch (Full/Partial)' };
      case 'DISPATCHED':   return { phase: 'Dispatched',         action: 'Upload LR Photo' };
      case 'COMPLETED':    return { phase: 'Completed',          action: null };
      default:
        // QUOTATION is both the initial status and the "quotation generated" status.
        // Presence of weights means weights have been entered, so the quotation is ready.
        return (totalWeightKg && totalWeightKg > 0)
          ? { phase: 'Quotation Generated', action: 'Upload Bill' }
          : { phase: 'Order Created',       action: 'Add Weights' };
    }
  };

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      const formatted = data.map((o: any) => {
        const { phase, action } = mapPhase(o.statusName, o.totalWeightKg);
        return {
          id: o.id || o.orderNumber,
          orderNumber: o.orderNumber,
          customerId: o.customerId,
          customer: o.customerId ? 'Customer ' + o.customerId.substring(0, 4) : 'Unknown',
          items: o.items?.length || 0,
          totalWeight: o.totalWeightKg ? `${o.totalWeightKg} kg` : 'Pending',
          amount: `₹${(o.totalAmount || 0).toLocaleString()}`,
          phase,
          action,
          date: new Date(o.createdAt || Date.now()).toISOString().split('T')[0],
          itemsList: o.items?.map((i: any) => ({
            id: i.id,
            variantId: i.productVariantId,
            name: 'Product ' + i.productVariantId.substring(0, 4),
            qty: i.noOfBundles || 1,
            weights: i.bundleWeights ? i.bundleWeights.split(',').map(Number) : [],
            price: i.unitRate || 0
          })) || []
        };
      });
      setOrders(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Deep Linking from Dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    if (orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setSelectedOrder(order);
        setView('details');
      }
    }
  }, [orders]);

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    setView('details');
    try {
      const full = await fetchOrderByIdAPI(order.id);
      if (full) {
        setSelectedOrder((prev: any) => ({ ...prev, attachments: full.attachments || [] }));
      }
    } catch (e) {
      console.error('Failed to fetch order details', e);
    }
  };

  // Maps current phase → { db status to revert to, phase to show after undo }
  // Only phases with a distinct DB status transition are undoable.
  const UNDO_MAP: Record<string, { statusName: string; phase: string; action: string | null }> = {
    'Bill Uploaded':        { statusName: 'QUOTATION',  phase: 'Quotation Generated', action: 'Upload Bill' },
    'Partially Dispatched': { statusName: 'CONFIRMED',  phase: 'Bill Uploaded',        action: 'Dispatch (Full/Partial)' },
    'Dispatched':           { statusName: 'CONFIRMED',  phase: 'Bill Uploaded',        action: 'Dispatch (Full/Partial)' },
    'Completed':            { statusName: 'DISPATCHED', phase: 'Dispatched',           action: 'Upload LR Photo' },
  };

  const handleUndo = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const undoTarget = UNDO_MAP[order.phase];
    if (!undoTarget) return; // phases sharing QUOTATION status have no meaningful DB undo

    const statusId = statusMap[undoTarget.statusName];
    if (!statusId) {
      console.warn('Status ID not found for', undoTarget.statusName);
      return;
    }

    try {
      await updateOrderStatusAPI(orderId, statusId);
      const phaseUpdate = { phase: undoTarget.phase, action: undoTarget.action };
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...phaseUpdate } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, ...phaseUpdate }));
    } catch (e) {
      console.error('Failed to undo', e);
      alert('Failed to undo last step');
    }
  };

  const [showAddWeightsModal, setShowAddWeightsModal] = useState(false);
  const [weightsFormData, setWeightsFormData] = useState<any[]>([]);
  const extraFileInputRef = useRef<HTMLInputElement>(null);
  const [addPhotoContext, setAddPhotoContext] = useState<{ orderId: string; attachmentType: string } | null>(null);

  const handleButtonClick = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.phase === 'Order Created') {
      setActiveOrderId(orderId);
      setWeightsFormData(order.itemsList.map((item: any) => ({
        ...item,
        weights: Array.isArray(item.weights) && item.weights.length === item.qty 
          ? [...item.weights] 
          : Array(item.qty).fill('')
      })));
      setShowAddWeightsModal(true);
      return;
    }
    if (order?.phase === 'Weights Added') {
      handleAction(orderId);
      return;
    }
    setActiveOrderId(orderId);
    setShowActionSheet(true);
  };

  const handleSaveWeights = async () => {
    if (!activeOrderId) return;
    
    const orderToUpdate = orders.find(o => o.id === activeOrderId);
    if (!orderToUpdate) return;
    
    try {
      const updatedItemsList = weightsFormData;

      const payload = {
        customerId: orderToUpdate.customerId,
        items: updatedItemsList.map(i => {
          const itemWt = i.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0);
          return {
            productVariantId: i.variantId,
            weightKg: itemWt,
            bundleWeights: i.weights.join(',')
          };
        })
      };

      await updateOrderWeightsAPI(activeOrderId, payload);
      
      const grandTotalWt = updatedItemsList.reduce((sum, item) => sum + item.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0), 0);
      const updatedOrder = {
        totalWeight: `${grandTotalWt} kg`,
        itemsList: updatedItemsList,
        phase: 'Quotation Generated',
        action: 'Upload Bill'
      };
      setOrders(prev => prev.map(order => {
        if (order.id !== activeOrderId) return order;
        return { ...order, ...updatedOrder };
      }));
      if (selectedOrder?.id === activeOrderId) {
        setSelectedOrder((prev: any) => ({ ...prev, ...updatedOrder }));
      }
    } catch(e) {
      console.error(e);
    }
    
    setShowAddWeightsModal(false);
    setActiveOrderId(null);
  };

  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [itemPrices, setItemPrices] = useState<number[]>([]);
  const [itemQtys, setItemQtys] = useState<number[]>([]);
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    if (selectedOrder?.itemsList) {
      setItemPrices(selectedOrder.itemsList.map((i: any) => i.price || 0));
      setItemQtys(selectedOrder.itemsList.map((i: any) => i.qty || 1));
    }
  }, [selectedOrder?.id]);

  const handleSavePrices = async () => {
    if (!selectedOrder) return;
    setSavingPrices(true);
    try {
      const payload = {
        customerId: selectedOrder.customerId,
        items: selectedOrder.itemsList.map((item: any, idx: number) => ({
          productVariantId: item.variantId,
          noOfBundles: itemQtys[idx] ?? item.qty,
          unitRate: itemPrices[idx],
          lineTotal: (itemQtys[idx] ?? item.qty) * itemPrices[idx]
        }))
      };
      await updateOrderWeightsAPI(selectedOrder.id, payload);
      const newTotal = selectedOrder.itemsList.reduce((sum: number, item: any, idx: number) => sum + (itemQtys[idx] ?? item.qty) * (itemPrices[idx] || 0), 0);
      const updated = {
        ...selectedOrder,
        amount: `₹${newTotal.toLocaleString()}`,
        itemsList: selectedOrder.itemsList.map((item: any, idx: number) => ({ ...item, qty: itemQtys[idx] ?? item.qty, price: itemPrices[idx] }))
      };
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
    } catch (e) {
      console.error('Failed to save prices', e);
      alert('Failed to save prices');
    } finally {
      setSavingPrices(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirmDeleteOrderId) return;
    const orderId = confirmDeleteOrderId;
    setConfirmDeleteOrderId(null);
    try {
      await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setView('list');
    } catch (e) {
      console.error('Failed to delete order', e);
      alert('Failed to delete order');
    }
  };

  const [dispatchType, setDispatchType] = useState<'Full' | 'Partial' | null>(null);

  const getAttachmentType = (phase: string) => {
    if (phase === 'Dispatched') return 'LR_PHOTO';
    if (phase === 'Bill Uploaded' || phase === 'Partially Dispatched') return 'DISPATCH_PHOTO';
    return 'INVOICE';
  };

  // Which attachment types belong to each workflow phase
  const PHASE_ATTACHMENT_TYPES: Record<string, string[]> = {
    'Bill Uploaded':        ['INVOICE'],
    'Partially Dispatched': ['DISPATCH_PHOTO'],
    'Dispatched':           ['DISPATCH_PHOTO'],
    'Completed':            ['LR_PHOTO'],
  };

  const uploadFiles = async (files: File[], orderId: string, attachmentType: string) => {
    for (const file of files) {
      const presignRes = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/attachments/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: attachmentType, fileName: file.name, contentType: file.type || 'application/octet-stream' })
      });
      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, key } = await presignRes.json();

      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if (!s3Res.ok) throw new Error('S3 upload failed');

      await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key, type: attachmentType, fileName: file.name })
      });
    }
  };

  const handleExtraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !addPhotoContext) return;
    const { orderId, attachmentType } = addPhotoContext;
    setAddPhotoContext(null);
    try {
      await uploadFiles(files, orderId, attachmentType);
      const full = await fetchOrderByIdAPI(orderId);
      if (full) setSelectedOrder((prev: any) => ({ ...prev, attachments: full.attachments || [] }));
    } catch (err) {
      console.error('Extra upload failed', err);
      alert('Upload failed. Please try again.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeOrderId) return;
    e.target.value = '';

    const order = orders.find(o => o.id === activeOrderId);
    if (!order) return;

    const attachmentType = getAttachmentType(order.phase);
    const targetPhase = dispatchType === 'Partial' ? 'Partially Dispatched' : undefined;
    setShowActionSheet(false);

    try {
      await uploadFiles(files, activeOrderId, attachmentType);
      await handleAction(activeOrderId, targetPhase);
      const full = await fetchOrderByIdAPI(activeOrderId);
      if (full) setSelectedOrder((prev: any) => ({ ...prev, attachments: full.attachments || [] }));
    } catch (err) {
      console.error('Upload failed', err);
      alert('File upload failed. Please try again.');
    } finally {
      setActiveOrderId(null);
      setDispatchType(null);
    }
  };

  const handleAction = async (orderId: string, targetPhase?: string) => {
    try {
      // Find current phase to determine next phase
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const currentIdx = PHASES.findIndex(p => p.phase === order.phase);
      let nextPhase;
      
      if (targetPhase) {
        nextPhase = PHASES.find(p => p.phase === targetPhase);
      } else {
        nextPhase = PHASES[currentIdx + 1];
        if (order.phase === 'Bill Uploaded' || order.phase === 'Partially Dispatched') {
            nextPhase = PHASES.find(p => p.phase === 'Dispatched');
        }
      }
      
      if (nextPhase) {
        const phaseToStatus: Record<string, string> = {
          'Quotation Generated': 'QUOTATION',
          'Bill Uploaded': 'CONFIRMED',
          'Dispatched': 'DISPATCHED',
          'Partially Dispatched': 'DISPATCHED',
          'Completed': 'COMPLETED',
        };
        const dbStatusName = phaseToStatus[nextPhase.phase];
        const realStatusId = dbStatusName && statusMap[dbStatusName]
          ? statusMap[dbStatusName]
          : Object.values(statusMap)[0];
        if (!realStatusId) {
          console.warn('No status ID found for phase', nextPhase.phase);
          return;
        }
        await updateOrderStatusAPI(orderId, realStatusId);
        
        const phaseUpdate = { phase: nextPhase.phase, action: nextPhase.action };
        setOrders(prev => prev.map(o => o.id !== orderId ? o : { ...o, ...phaseUpdate }));
        if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, ...phaseUpdate }));
      }
    } catch(e) {
      console.error(e);
      alert('Failed to update order status');
    }
  };

  const handleShareQuotation = (order: any) => {
    const itemsText = order.itemsList.map((item: any) => {
      const totalWt = Array.isArray(item.weights) 
        ? item.weights.reduce((a: number, b: number) => a + (parseFloat(b as any) || 0), 0)
        : (item.weight || 0);
      const weightStr = totalWt > 0 ? ` (${totalWt} kg)` : '';
      return `• ${item.name}: ${item.qty} Bundles${weightStr}`;
    }).join('\n');

    const message = `*KSP Quotation - #${order.id}*\n` +
      `Customer: ${order.customer}\n` +
      `Date: ${order.date}\n\n` +
      `*Items:*\n${itemsText}\n\n` +
      `*Total Amount: ${order.amount}*\n\n` +
      `_Generated via KSP Portal_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
    }
  };

  const [orderItems, setOrderItems] = useState([
    { id: Date.now(), product: '', qty: 1, rate: 0 }
  ]);

  const handleConfirmBooking = async () => {
    const cust = customersList.find(c => c.id === selectedCustomer);
    const customerName = cust ? cust.name : 'Unknown Client';
    
    const totalQty = orderItems.reduce((sum, item) => sum + item.qty, 0);
    
    const payload = {
      customerId: selectedCustomer,
      notes: "Order placed from UI",
      items: orderItems.map(item => ({
        productVariantId: item.product,
        noOfBundles: item.qty,
        unitRate: item.rate,
        lineTotal: item.qty * item.rate
      }))
    };

    try {
      const response = await createOrderAPI(payload);

      const orderTotal = orderItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
      const newOrder = {
        id: response.id,
        customer: customerName,
        items: totalQty,
        totalWeight: `Pending`,
        amount: `₹${(response.totalAmount || orderTotal).toLocaleString()}`,
        phase: 'Order Created',
        action: 'Add Weights',
        date: new Date().toISOString().split('T')[0],
        itemsList: orderItems.map(item => ({
          name: item.product,
          qty: item.qty,
          weights: Array(item.qty).fill(''),
          price: item.rate
        }))
      };

      setOrders(prev => [newOrder, ...prev]);
      setTab('ongoing');
      setWizardStep(1);
      setSelectedCustomer('');
      setOrderItems([{ id: Date.now(), product: '', qty: 1, rate: 0 }]);
    } catch (e) {
      console.error(e);
      alert('Failed to create order');
    }
  };

  const handleShareEnquiry = () => {
    const itemsText = orderItems.map((item: any) => {
      return `• ${item.product}: ${item.qty} Bundles`;
    }).join('\n');

    const totalAmt = orderItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const cust = customersList.find(c => c.id === selectedCustomer);
    const customerName = cust ? cust.name : 'New Client';

    const message = `*KSP Enquiry - Quotation Template*\n` +
      `Customer: ${customerName}\n\n` +
      `*Proposed Items:*\n${itemsText}\n\n` +
      `*Estimated Total: ₹${totalAmt.toLocaleString()}*\n\n` +
      `_This is a pre-booking enquiry quote._`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
    }
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
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {order.action && (
                <Button
                  variant="primary"
                  onClick={(e) => { e.stopPropagation(); handleButtonClick(order.id); }}
                  style={{ flex: 1, fontSize: '0.8rem', padding: 'var(--space-2)' }}
                >
                  Action: {order.action}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteOrderId(order.id); }}
                  style={{ fontSize: '0.8rem', padding: 'var(--space-2) var(--space-3)', color: '#fa5252', borderColor: '#fa5252' }}
                >
                  Delete
                </Button>
              )}
            </div>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Order Details</h2>
          </div>
          
          {selectedOrder.phase === 'Quotation Generated' && (
            <Button 
              variant="outline" 
              onClick={() => handleShareQuotation(selectedOrder)}
              style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Share2 size={16} /> Share Quote
            </Button>
          )}
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
            {selectedOrder.itemsList?.map((item: any, idx: number) => {
              const isEditable = selectedOrder.phase !== 'Dispatched' && selectedOrder.phase !== 'Completed';
              const unitPrice = itemPrices[idx] ?? item.price ?? 0;
              const qty = itemQtys[idx] ?? item.qty ?? 1;
              return (
                <div key={idx} style={{ padding: 'var(--space-4)', borderBottom: idx < selectedOrder.itemsList.length - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {isEditable ? (
                        <Input
                          type="number"
                          value={qty}
                          onChange={(e) => setItemQtys(prev => {
                            const next = [...prev];
                            next[idx] = parseInt(e.target.value) || 1;
                            return next;
                          })}
                          style={{ width: '60px', height: '28px', padding: '2px 6px', fontSize: '0.8rem', display: 'inline-block' }}
                        />
                      ) : (
                        <span>{qty}</span>
                      )}
                      <span>Bundles ×</span>
                      {isEditable ? (
                        <Input
                          type="number"
                          value={unitPrice}
                          onChange={(e) => setItemPrices(prev => {
                            const next = [...prev];
                            next[idx] = parseFloat(e.target.value) || 0;
                            return next;
                          })}
                          style={{ width: '80px', height: '28px', padding: '2px 6px', fontSize: '0.8rem', display: 'inline-block' }}
                        />
                      ) : (
                        <span>₹{unitPrice}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>₹{(qty * unitPrice).toLocaleString()}</div>
                </div>
              );
            })}
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--color-border)' }}>
              <span style={{ fontWeight: 600 }}>Grand Total</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                {selectedOrder.phase !== 'Dispatched' && selectedOrder.phase !== 'Completed'
                  ? `₹${selectedOrder.itemsList.reduce((sum: number, item: any, idx: number) => sum + (itemQtys[idx] ?? item.qty) * (itemPrices[idx] ?? item.price ?? 0), 0).toLocaleString()}`
                  : selectedOrder.amount
                }
              </span>
            </div>
          </Card>
          {selectedOrder.phase !== 'Dispatched' && selectedOrder.phase !== 'Completed' && (
            <Button
              variant="primary"
              style={{ width: '100%', marginTop: 'var(--space-3)', fontSize: '0.85rem' }}
              onClick={handleSavePrices}
              disabled={savingPrices}
            >
              {savingPrices ? 'Saving...' : 'Save Prices'}
            </Button>
          )}
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
              const phaseAttachmentTypes = PHASE_ATTACHMENT_TYPES[p.phase] || [];
              const phaseAttachments = (selectedOrder.attachments || []).filter((a: any) => phaseAttachmentTypes.includes(a.type));

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
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                    background: isPending ? 'white' : 'var(--color-primary)',
                    border: isPending ? '2px solid var(--color-border)' : 'none',
                    marginTop: '4px', zIndex: 1,
                    boxShadow: isCurrent ? '0 0 0 4px var(--color-primary-light)' : 'none'
                  }}>
                    {isCompleted && (
                      <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '10px' }}>✓</div>
                    )}
                  </div>

                  <div style={{ opacity: isPending ? 0.5 : 1, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isCurrent ? 'var(--color-primary)' : 'inherit' }}>
                      {p.phase}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {isCompleted ? 'Completed' : isCurrent ? 'Waiting for action...' : 'Pending'}
                    </div>

                    {/* Inline attachments for this step */}
                    {phaseAttachments.length > 0 && (
                      <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {phaseAttachments.map((att: any) => {
                          const isImage = att.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          return isImage ? (
                            <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img
                                src={att.fileUrl}
                                alt={att.fileName}
                                style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                              />
                            </a>
                          ) : (
                            <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-primary)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>
                              <FileText size={14} /> {att.fileName}
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Add more photos button for completed steps that have attachments */}
                    {(isCompleted || isCurrent) && phaseAttachmentTypes.length > 0 && (
                      <button
                        onClick={() => {
                          setAddPhotoContext({ orderId: selectedOrder.id, attachmentType: phaseAttachmentTypes[0] });
                          extraFileInputRef.current?.click();
                        }}
                        style={{ marginTop: 'var(--space-2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-primary)', padding: 0 }}
                      >
                        + Add Photo
                      </button>
                    )}
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

          {UNDO_MAP[selectedOrder.phase] && (
            <Button variant="outline" onClick={() => handleUndo(selectedOrder.id)} style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
              <RotateCcw size={16} style={{ marginRight: '8px' }} />
              Undo Last Step
            </Button>
          )}

          {canDelete && (
            <Button variant="outline" onClick={() => setConfirmDeleteOrderId(selectedOrder.id)} style={{ color: '#fa5252', borderColor: '#fa5252' }}>
              Delete Order
            </Button>
          )}
        </div>
      </div>
    );
  };

  const updateItem = (id: number, field: string, value: any) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'qty') {
        return { ...item, qty: parseInt(value) || 0 };
      }
      if (field === 'product') {
        let rate = 0;
        for (const p of productsList) {
          const variant = p.variants?.find((v: any) => v.id === value);
          if (variant) { rate = variant.rateOverride || 0; break; }
        }
        return { ...item, product: value, rate };
      }
      return { ...item, [field]: value };
    }));
  };

  const addItem = () => {
    setOrderItems(prev => [...prev, { id: Date.now(), product: '', qty: 1, rate: 0 }]);
  };

  // Renders the Create Order Wizard
  const renderWizard = () => {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Create Order</h2>
          <Badge status="upcoming">Step {wizardStep} of 3</Badge>
        </div>

        {wizardStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Select Customer</label>
              <select className="input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="" disabled>Choose a customer...</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="new">+ Add New Customer...</option>
              </select>
            </div>
            
            {selectedCustomer === 'new' && (
              <Card style={{ background: 'var(--color-surface-muted)', border: 'none', padding: 'var(--space-4)' }}>
                <h4 style={{ margin: '0 0 var(--space-4) 0' }}>New Customer Details</h4>
                <CustomerForm
                  isCompact
                  onSubmit={async (data: any) => {
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/v1/customers`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(data),
                      });
                      if (res.ok) {
                        const created = await res.json();
                        setCustomersList(prev => [...prev, created]);
                        setSelectedCustomer(created.id);
                      } else {
                        alert('Failed to create customer');
                      }
                    } catch (e) {
                      console.error(e);
                      alert('Failed to create customer');
                    }
                  }}
                  onCancel={() => setSelectedCustomer('')}
                  submitLabel="Add & Select"
                />
              </Card>
            )}

            <Button variant="primary" onClick={() => setWizardStep(2)} disabled={!selectedCustomer || selectedCustomer === 'new'}>
              Next: Select Items
            </Button>
          </div>
        )}

        {wizardStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {orderItems.map((item) => (
              <div key={item.id} style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Product</label>
                    <select 
                      className="input-field" 
                      value={item.product}
                      onChange={(e) => updateItem(item.id, 'product', e.target.value)}
                    >
                      <option value="">Select a product...</option>
                      {productsList.map(p => 
                        p.variants?.map((v: any) => (
                          <option key={v.id} value={v.id}>{p.name} - {v.size}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Quantity</label>
                    <Input 
                      type="number" 
                      value={item.qty} 
                      onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addItem} style={{ borderStyle: 'dashed', fontSize: '0.85rem' }}>
              + Add Another Product
            </Button>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Button variant="outline" onClick={() => setWizardStep(1)} style={{ flex: 1 }}>Back</Button>
              <Button variant="primary" onClick={() => setWizardStep(3)} style={{ flex: 2 }}>Next: Review Quote</Button>
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-surface-muted)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.95rem' }}>Quotation Summary</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {orderItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>
                      <strong>{item.product}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {item.qty} Bundles × ₹{item.rate.toLocaleString()}
                      </div>
                    </span>
                    <span style={{ fontWeight: 600 }}>₹{(item.qty * item.rate).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-4) 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--color-primary)' }}>
                  ₹{orderItems.reduce((sum, item) => sum + (item.qty * item.rate), 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Button 
                variant="outline" 
                onClick={handleShareEnquiry}
                style={{ width: '100%', borderColor: 'var(--color-primary)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Share2 size={18} /> Share as Enquiry (Template)
              </Button>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button variant="outline" onClick={() => setWizardStep(2)} style={{ flex: 1 }}>Back</Button>
                <Button variant="primary" onClick={handleConfirmBooking} style={{ flex: 2 }}>Confirm & Create Order</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="page-content">
      {/* Hidden inputs for different capture modes */}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,application/pdf" multiple onChange={handleFileChange} />
      <input type="file" ref={cameraInputRef} style={{ display: 'none' }} accept="image/*" capture="environment" onChange={handleFileChange} />
      <input type="file" ref={extraFileInputRef} style={{ display: 'none' }} accept="image/*,application/pdf" multiple onChange={handleExtraFileChange} />

      {/* Delete Order Confirmation */}
      {confirmDeleteOrderId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>Delete Order?</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              This will permanently delete order <strong>#{confirmDeleteOrderId}</strong> and all its data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setConfirmDeleteOrderId(null)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 1, background: '#fa5252', borderColor: '#fa5252' }} onClick={handleDeleteOrder}>Delete</Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Add Weights Modal */}
      {showAddWeightsModal && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, top: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)'
        }} onClick={() => setShowAddWeightsModal(false)}>
          <Card style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-6)', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>Add Bundle Weights</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {weightsFormData.map((item, itemIdx) => (
                <div key={itemIdx}>
                  <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: '0.9rem' }}>{item.name} ({item.qty} Bundles)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 'var(--space-3)' }}>
                    {item.weights.map((w: any, wIdx: number) => (
                      <div key={wIdx} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-8px', left: '6px', fontSize: '10px', background: 'white', padding: '0 4px', color: 'var(--color-primary)', fontWeight: 600 }}>#{wIdx + 1}</span>
                        <Input 
                          type="number"
                          style={{ textAlign: 'center', height: '44px' }}
                          value={w}
                          onChange={(e) => {
                            const newForm = [...weightsFormData];
                            newForm[itemIdx].weights[wIdx] = e.target.value;
                            setWeightsFormData(newForm);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowAddWeightsModal(false)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleSaveWeights}>Save Weights</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Custom Action Sheet */}
      {showActionSheet && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, top: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end'
        }} onClick={() => { setShowActionSheet(false); setDispatchType(null); }}>
          <div style={{
            width: '100%', background: 'white', 
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            padding: 'var(--space-6)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            {(orders.find(o => o.id === activeOrderId)?.phase === 'Bill Uploaded' || orders.find(o => o.id === activeOrderId)?.phase === 'Partially Dispatched') ? (
              <>
                <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', textAlign: 'center' }}>Dispatch Type</h3>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                  <Button 
                    variant={dispatchType === 'Full' ? 'primary' : 'outline'} 
                    style={{ flex: 1, height: '60px' }}
                    onClick={() => setDispatchType('Full')}
                  >
                    🚛 Full Dispatch
                  </Button>
                  <Button 
                    variant={dispatchType === 'Partial' ? 'primary' : 'outline'} 
                    style={{ flex: 1, height: '60px' }}
                    onClick={() => setDispatchType('Partial')}
                  >
                    📦 Partial Dispatch
                  </Button>
                </div>
              </>
            ) : (
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-6)', textAlign: 'center' }}>Complete Action</h3>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', opacity: ((orders.find(o => o.id === activeOrderId)?.phase === 'Bill Uploaded' || orders.find(o => o.id === activeOrderId)?.phase === 'Partially Dispatched') && !dispatchType) ? 0.5 : 1, pointerEvents: ((orders.find(o => o.id === activeOrderId)?.phase === 'Bill Uploaded' || orders.find(o => o.id === activeOrderId)?.phase === 'Partially Dispatched') && !dispatchType) ? 'none' : 'auto' }}>
              <Button variant="primary" style={{ padding: 'var(--space-4)' }} onClick={() => cameraInputRef.current?.click()}>
                📷 Take Photo (Camera)
              </Button>
              <Button variant="outline" style={{ padding: 'var(--space-4)' }} onClick={() => fileInputRef.current?.click()}>
                🖼️ Choose from Gallery / Files
              </Button>
              <Button variant="outline" style={{ marginTop: 'var(--space-2)', border: 'none' }} onClick={() => { setShowActionSheet(false); setDispatchType(null); }}>
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <SegmentedControl
          options={[
            { label: 'Ongoing', value: 'ongoing' },
            { label: 'Completed', value: 'completed' },
          ]}
          value={tab === 'new' ? 'ongoing' : tab}
          onChange={(val) => { setTab(val); setView('list'); setWizardStep(1); }}
        />
        <Button
          variant="primary"
          style={{ padding: '6px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          onClick={() => { setTab('new'); setView('list'); setWizardStep(1); }}
        >
          + New Order
        </Button>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        {view === 'details' ? renderDetails() : (tab === 'new' ? renderWizard() : renderList())}
      </div>
    </div>
  );
};
