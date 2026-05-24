import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Share2 } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { CustomerForm } from '../components/customers/CustomerForm';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
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
  const { theme } = useOrg();
  const orgName = theme.displayName || 'Portal';
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
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState<number | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemVariantId, setNewItemVariantId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  useEffect(() => {
    if (selectedOrder?.itemsList) {
      setItemPrices(selectedOrder.itemsList.map((i: any) => i.price || 0));
      setItemQtys(selectedOrder.itemsList.map((i: any) => i.qty || 1));
      setSelectedPhaseIdx(null);
    }
  }, [selectedOrder?.id]);

  const handleSavePrices = async () => {
    if (!selectedOrder) return;
    setSavingPrices(true);
    try {
      const payload = {
        customerId: selectedOrder.customerId,
        items: selectedOrder.itemsList.map((item: any, idx: number) => {
          const w = Array.isArray(item.weights)
            ? item.weights.reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0)
            : (item.weightKg || 0);
          return {
            productVariantId: item.variantId,
            noOfBundles: item.qty,
            unitRate: itemPrices[idx],
            lineTotal: w * itemPrices[idx]
          };
        })
      };
      await updateOrderWeightsAPI(selectedOrder.id, payload);
      const newTotal = selectedOrder.itemsList.reduce((sum: number, item: any, idx: number) => {
        const w = Array.isArray(item.weights)
          ? item.weights.reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0)
          : (item.weightKg || 0);
        return sum + w * (itemPrices[idx] || 0);
      }, 0);
      const updated = {
        ...selectedOrder,
        amount: `₹${newTotal.toLocaleString()}`,
        itemsList: selectedOrder.itemsList.map((item: any, idx: number) => ({ ...item, price: itemPrices[idx] }))
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

  const handleResendToCustomer = (phase: string) => {
    if (!selectedOrder) return;
    const base = `*${orgName} Order Update - #${selectedOrder.orderNumber || selectedOrder.id}*\nCustomer: ${selectedOrder.customer}\n\n`;
    const messages: Record<string, string> = {
      'Order Created':          `Your order has been created.\n\nItems: ${selectedOrder.items} Bundles\nDate: ${selectedOrder.date}`,
      'Weights Added':          `Weights have been recorded for your order.\n\nTotal Weight: ${selectedOrder.totalWeight}`,
      'Quotation Generated':    `Your quotation is ready.\n\nTotal: ${selectedOrder.amount}\n\n_Reply to confirm._`,
      'Bill Uploaded':          `Your bill has been prepared.\n\nTotal: ${selectedOrder.amount}\n\n_Contact us for any queries._`,
      'Partially Dispatched':   `Partial shipment has been dispatched.\n\nTotal: ${selectedOrder.amount}`,
      'Dispatched':             `Your order has been fully dispatched.\n\nTotal: ${selectedOrder.amount}`,
      'Completed':              `Your order is complete. Thank you!\n\nTotal: ${selectedOrder.amount}`,
    };
    const body = messages[phase] ?? `Order status: ${phase}`;
    const message = base + body + `\n\n_${orgName} Portal_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    if (navigator.clipboard) navigator.clipboard.writeText(message);
  };

  const handleAddItemToOrder = async () => {
    if (!selectedOrder || !newItemVariantId) return;
    let rate = 0;
    let itemName = newItemVariantId;
    for (const p of productsList) {
      const variant = p.variants?.find((v: any) => v.id === newItemVariantId);
      if (variant) { rate = variant.rateOverride || 0; itemName = `${p.name} - ${variant.size}`; break; }
    }
    const newItem = { variantId: newItemVariantId, name: itemName, qty: newItemQty, weights: Array(newItemQty).fill(''), price: rate };
    const updatedItems = [...selectedOrder.itemsList, newItem];
    const payload = {
      customerId: selectedOrder.customerId,
      items: updatedItems.map(i => ({
        productVariantId: i.variantId,
        noOfBundles: i.qty,
        unitRate: i.price || 0,
        lineTotal: 0
      }))
    };
    try {
      await updateOrderWeightsAPI(selectedOrder.id, payload);
      const updated = { ...selectedOrder, items: updatedItems.length, itemsList: updatedItems };
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setItemPrices(updatedItems.map(i => i.price || 0));
      setItemQtys(updatedItems.map(i => i.qty || 1));
      setShowAddItemForm(false);
      setNewItemVariantId('');
      setNewItemQty(1);
    } catch (e) {
      console.error('Failed to add product', e);
      alert('Failed to add product');
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

    const message = `*${orgName} Quotation - #${order.id}*\n` +
      `Customer: ${order.customer}\n` +
      `Date: ${order.date}\n\n` +
      `*Items:*\n${itemsText}\n\n` +
      `*Total Amount: ${order.amount}*\n\n` +
      `_Generated via ${orgName} Portal_`;

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

    const message = `*${orgName} Enquiry - Quotation Template*\n` +
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
    const effectiveIdx = selectedPhaseIdx ?? currentIdx;

    const PHASE_SHORT: Record<string, string> = {
      'Order Created':       'Created',
      'Weights Added':       'Weights',
      'Quotation Generated': 'Quotation',
      'Bill Uploaded':       'Bill',
      'Partially Dispatched':'Partial',
      'Dispatched':          'Dispatched',
      'Completed':           'Complete',
    };

    const renderRightPanel = () => {
      const phase = PHASES[effectiveIdx];
      if (!phase) return null;

      const isCurrent = effectiveIdx === currentIdx;
      const isPast    = effectiveIdx < currentIdx;
      const isFuture  = effectiveIdx > currentIdx;
      const isEditable = !isFuture && selectedOrder.phase !== 'Dispatched' && selectedOrder.phase !== 'Completed';

      const phaseAttachTypes = PHASE_ATTACHMENT_TYPES[phase.phase] || [];
      const phaseAtts = (selectedOrder.attachments || []).filter((a: any) => phaseAttachTypes.includes(a.type));

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Status label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Badge status={isFuture ? 'upcoming' : isCurrent ? 'ongoing' : 'completed'}>
              {isFuture ? 'Pending' : isCurrent ? 'Current' : 'Done'}
            </Badge>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isCurrent ? 'var(--color-primary)' : 'inherit' }}>
              {phase.phase}
            </span>
          </div>

          {/* Order Created — item list + add product */}
          {phase.phase === 'Order Created' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {selectedOrder.itemsList?.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{item.qty} bundles</span>
                </div>
              ))}

              {showAddItemForm ? (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%', boxSizing: 'border-box' }}>
                  <select
                    className="input-field"
                    value={newItemVariantId}
                    onChange={(e) => setNewItemVariantId(e.target.value)}
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  >
                    <option value="">Select product...</option>
                    {productsList.filter((p: any) => p.isActive !== false).map((p: any) =>
                      p.variants?.filter((v: any) => v.isActive !== false).map((v: any) => (
                        <option key={v.id} value={v.id}>{p.name} - {v.size}</option>
                      ))
                    )}
                  </select>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Qty</label>
                    <Input
                      type="number"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                      style={{ flex: 1, height: '32px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem', padding: 'var(--space-2)' }} onClick={() => { setShowAddItemForm(false); setNewItemVariantId(''); setNewItemQty(1); }}>Cancel</Button>
                    <Button variant="primary" style={{ flex: 2, fontSize: '0.8rem', padding: 'var(--space-2)' }} onClick={handleAddItemToOrder} disabled={!newItemVariantId}>Add</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddItemForm(true)}
                  style={{ background: 'none', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-primary)', textAlign: 'center' }}
                >
                  + Add Product
                </button>
              )}
            </div>
          )}

          {/* Quotation / Weights Added — pricing editor */}
          {(phase.phase === 'Quotation Generated' || phase.phase === 'Weights Added') && (
            <>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {selectedOrder.itemsList?.map((item: any, idx: number) => {
                  const unitPrice = itemPrices[idx] ?? item.price ?? 0;
                  const totalWt = Array.isArray(item.weights)
                    ? item.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0)
                    : (item.weightKg || 0);
                  return (
                    <div key={idx} style={{ padding: 'var(--space-3)', borderBottom: idx < (selectedOrder.itemsList?.length ?? 0) - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span
                            onClick={() => {
                              setActiveOrderId(selectedOrder.id);
                              setWeightsFormData(selectedOrder.itemsList.map((item: any) => ({
                                ...item,
                                weights: Array.isArray(item.weights) && item.weights.length === item.qty
                                  ? [...item.weights]
                                  : Array(item.qty).fill('')
                              })));
                              setShowAddWeightsModal(true);
                            }}
                            style={{ cursor: 'pointer', color: 'var(--color-primary)', borderBottom: '1px dashed var(--color-primary)' }}
                          >
                            {totalWt > 0 ? `${totalWt} kg` : 'No weight'}
                          </span>
                          <span>×</span>
                          {isEditable ? (
                            <Input
                              type="number" value={unitPrice}
                              onChange={(e) => setItemPrices(prev => { const n = [...prev]; n[idx] = parseFloat(e.target.value) || 0; return n; })}
                              style={{ width: '65px', height: '24px', padding: '1px 4px', fontSize: '0.75rem', display: 'inline-block' }}
                            />
                          ) : <span>₹{unitPrice}</span>}
                          <span>/kg</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ₹{(totalWt * unitPrice).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-muted)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>
                    ₹{(selectedOrder.itemsList?.reduce((sum: number, item: any, idx: number) => {
                      const wt = Array.isArray(item.weights) ? item.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0) : (item.weightKg || 0);
                      return sum + wt * (itemPrices[idx] ?? item.price ?? 0);
                    }, 0) ?? 0).toLocaleString()}
                  </span>
                </div>
              </Card>
              {isEditable && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="outline" onClick={handleSavePrices} disabled={savingPrices} style={{ fontSize: '0.8rem', flex: 1 }}>
                    {savingPrices ? 'Saving...' : 'Save Prices'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveOrderId(selectedOrder.id);
                      setWeightsFormData(selectedOrder.itemsList.map((item: any) => ({
                        ...item,
                        weights: Array.isArray(item.weights) && item.weights.length === item.qty
                          ? [...item.weights]
                          : Array(item.qty).fill('')
                      })));
                      setShowAddWeightsModal(true);
                    }}
                    style={{ fontSize: '0.8rem', flex: 1 }}
                  >
                    Edit Weights
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => handleShareQuotation(selectedOrder)}
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
              >
                <Share2 size={14} /> Share Quotation
              </Button>
            </>
          )}

          {/* Attachments */}
          {phaseAttachTypes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {phaseAtts.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {phaseAtts.map((att: any) => {
                    const isImage = att.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    return isImage ? (
                      <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                        <img src={att.fileUrl} alt={att.fileName} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                      </a>
                    ) : (
                      <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-primary)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>
                        <FileText size={14} /> {att.fileName}
                      </a>
                    );
                  })}
                </div>
              ) : !isFuture && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>No files attached yet.</p>
              )}
              {!isFuture && (
                <button
                  onClick={() => { setAddPhotoContext({ orderId: selectedOrder.id, attachmentType: phaseAttachTypes[0] }); extraFileInputRef.current?.click(); }}
                  style={{ background: 'none', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-primary)', textAlign: 'center' }}
                >
                  + Add {phaseAttachTypes[0].replace(/_/g, ' ').toLowerCase()}
                </button>
              )}
            </div>
          )}

          {/* Send update to customer */}
          {!isFuture && (
            <button
              onClick={() => handleResendToCustomer(phase.phase)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
            >
              <Share2 size={14} /> Send Update to Customer
            </button>
          )}

          {/* Action button — current phase only */}
          {isCurrent && phase.action && (
            <Button variant="primary" onClick={() => handleButtonClick(selectedOrder.id)} style={{ width: '100%' }}>
              {phase.action}
            </Button>
          )}

          {isFuture && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
              Complete earlier steps to unlock this phase.
            </p>
          )}
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Order #{selectedOrder.orderNumber || selectedOrder.id}</h2>
              <Badge status={selectedOrder.phase === 'Completed' ? 'completed' : 'ongoing'}>
                {selectedOrder.phase}
              </Badge>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <span onClick={() => setShowCustomerModal(true)} style={{ cursor: 'pointer', color: 'var(--color-primary)', borderBottom: '1px dashed var(--color-primary)' }}>
                {selectedOrder.customer}
              </span>
              {' · '}{selectedOrder.items} Bundles · {selectedOrder.date}
            </p>
          </div>
        </div>

        {/* Split layout */}
        <div className="order-details-split" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
          {/* Left: Phase Navigation */}
          <div className="order-history-nav" style={{ width: '120px', flexShrink: 0 }}>
            {PHASES.map((p, i) => {
              const isCompleted = i < currentIdx;
              const isCurr     = i === currentIdx;
              const isPending  = i > currentIdx;
              const isSelected = i === effectiveIdx;
              const isNavigable = i <= currentIdx;

              return (
                <div key={i} style={{ position: 'relative' }}>
                  {i < PHASES.length - 1 && (
                    <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: 0, width: '2px', background: isCompleted ? 'var(--color-primary)' : 'var(--color-border)', zIndex: 0 }} />
                  )}
                  <div
                    onClick={() => {
                      if (!isNavigable) return;
                      if (p.phase === 'Weights Added' || p.phase === 'Quotation Generated') {
                        setActiveOrderId(selectedOrder.id);
                        setWeightsFormData(selectedOrder.itemsList.map((item: any) => ({
                          ...item,
                          weights: Array.isArray(item.weights) && item.weights.length === item.qty
                            ? [...item.weights]
                            : Array(item.qty).fill('')
                        })));
                        setShowAddWeightsModal(true);
                      } else {
                        setSelectedPhaseIdx(i);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', paddingBottom: 'var(--space-6)', cursor: isNavigable ? 'pointer' : 'default', position: 'relative' }}
                  >
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                      background: isPending ? 'white' : 'var(--color-primary)',
                      border: isPending ? '2px solid var(--color-border)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isSelected ? '0 0 0 4px var(--color-primary-light)' : isCurr ? '0 0 0 4px var(--color-primary-light)' : 'none',
                      zIndex: 1, position: 'relative', marginTop: '4px'
                    }}>
                      {isCompleted && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                    </div>
                    <div style={{ opacity: isPending ? 0.5 : 1 }}>
                      <span style={{
                        fontSize: '0.95rem',
                        fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? 'var(--color-primary)' : isCurr ? 'var(--color-primary)' : 'inherit',
                        lineHeight: 1.3,
                        display: 'block',
                      }}>
                        {PHASE_SHORT[p.phase] ?? p.phase}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {isPending ? 'Pending' : isCurr ? 'In progress' : 'Done'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Phase Content */}
          <div className="order-details-content" style={{ flex: 1, minWidth: 0 }}>
            {renderRightPanel()}

            {canDelete && (
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteOrderId(selectedOrder.id)}
                style={{ color: '#fa5252', borderColor: '#fa5252', width: '100%', marginTop: 'var(--space-4)', fontSize: '0.85rem' }}
              >
                Delete Order
              </Button>
            )}
          </div>
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
                      {productsList.filter((p: any) => p.isActive !== false).map(p =>
                        p.variants?.filter((v: any) => v.isActive !== false).map((v: any) => (
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

            <div style={{ background: 'var(--color-surface-muted)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.95rem' }}>Order Summary</h4>
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
                <span>Estimated Total</span>
                <span style={{ color: 'var(--color-primary)' }}>
                  ₹{orderItems.reduce((sum, item) => sum + (item.qty * item.rate), 0).toLocaleString()}
                </span>
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
        @media (max-width: 520px) {
          .order-details-split {
            flex-direction: column-reverse !important;
          }
          .order-details-content {
            width: 100% !important;
          }
          .order-details-content select,
          .order-details-content input {
            width: 100% !important;
            box-sizing: border-box;
          }
          .order-history-nav {
            width: 100% !important;
          }
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
