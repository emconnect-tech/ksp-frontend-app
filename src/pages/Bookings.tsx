import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Share2 } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';
import { CustomerForm } from '../components/customers/CustomerForm';
import { ProductVariantPicker } from '../components/ProductVariantPicker';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { usePermissions } from '../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { config } from '../config';
import { buildEnquiryMessage, buildQuotationMessage, buildStatusUpdateMessage } from '../config/messageTemplates';
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
  const [tab, setTab] = useState('pending');
  const [dialogState, setDialogState] = useState<{ title: string; message: string; onConfirm?: () => void } | null>(null);
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
  const { token, user } = useAuth();
  const { theme } = useOrg();
  const orgName = theme.displayName || 'Portal';
  const { canDelete } = usePermissions();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // WhatsApp connection status
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [showWaModal, setShowWaModal] = useState(false);
  // Per-phase notification status: key = `${orderId}:${phase}`
  const [notifStatus, setNotifStatus] = useState<Record<string, 'sent' | 'failed'>>({});

  useEffect(() => {
    loadAll();
    loadStatuses();
    checkWaStatus();
  }, []);

  const loadAll = async () => {
    const custs = await loadMasterData();
    await loadOrders(custs);
  };

  const checkWaStatus = async () => {
    if (config.WHATSAPP_TYPE === 'none') { setWaConnected(false); return; }
    if (config.WHATSAPP_TYPE === 'msg91') { setWaConnected(true); return; }
    try {
      const res = await fetch(`${config.WHATSAPP_WEB_URL}/status`);
      if (!res.ok) { setWaConnected(false); return; }
      const { status } = await res.json();
      setWaConnected(status === 'connected');
    } catch {
      setWaConnected(false);
    }
  };

  // Re-resolve customer name/phone as a safety net if orders load before customers
  useEffect(() => {
    if (customersList.length === 0 || orders.length === 0) return;
    setOrders(prev => prev.map(o => {
      if (o.customer && !o.customer.includes('-')) return o; // already resolved (not a UUID)
      const cust = customersList.find((c: any) => String(c.id) === String(o.customerId));
      if (!cust) return o;
      return { ...o, customer: cust.name, customerPhone: cust.phoneNumber || null, customerPlace: cust.place || null };
    }));
  }, [customersList, orders.length]);

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

  const loadMasterData = async (): Promise<any[]> => {
    if (config.USE_MOCK_API) {
      const custs = [{ id: '11111111-1111-1111-1111-111111111111', name: 'Planet Agro (Mock)' }];
      setCustomersList(custs);
      setProductsList([{ id: 'mock-prod-1', name: 'Green Net', variants: [{ id: '22222222-2222-2222-2222-222222222222', size: '110GSM', rateOverride: 210 }] }]);
      return custs;
    }
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/customers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/products?includeInactive=true`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      const custs = custRes.ok ? await custRes.json() : [];
      if (custRes.ok) setCustomersList(custs);
      if (prodRes.ok) setProductsList(await prodRes.json());
      return custs;
    } catch (e) {
      console.error('Failed to load master data', e);
      return [];
    }
  };

  const getVariantInfo = (variantId: number | string | null | undefined) => {
    if (!variantId) return { label: '—', gsm: null as number | null, size: '', rate: 0 };
    for (const p of productsList) {
      const v = p.variants?.find((v: any) => String(v.id) === String(variantId));
      if (v) return { label: `${p.name} • ${v.size ?? ''}`, gsm: v.gsm ?? null, size: v.size ?? '', rate: v.rateOverride || 0 };
    }
    return { label: String(variantId), gsm: null as number | null, size: '', rate: 0 };
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

  const loadOrders = async (custs?: any[]) => {
    try {
      const data = await fetchOrders();
      const resolvedCustomers = custs ?? customersList;
      const formatted = data.map((o: any) => {
        const { phase, action } = mapPhase(o.statusName, o.totalWeightKg);
        const cust = resolvedCustomers.find((c: any) => String(c.id) === String(o.customerId));
        return {
          id: o.id || o.orderNumber,
          orderNumber: o.orderNumber,
          customerId: o.customerId,
          customer: cust?.name || o.customerId || 'Unknown',
          customerPhone: cust?.phoneNumber || null,
          customerPlace: cust?.place || null,
          items: o.items?.length || 0,
          totalWeight: o.totalWeightKg ? `${o.totalWeightKg} kg` : 'Pending',
          amount: `${(o.totalAmount || 0).toLocaleString()}`,
          phase,
          action,
          notes: o.notes || '',
          date: new Date(o.createdAt || Date.now()).toISOString().split('T')[0],
          itemsList: o.items?.map((i: any) => ({
            id: i.id,
            variantId: i.productVariantId,
            name: String(i.productVariantId),
            qty: i.noOfBundles ?? 1,
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

  // Sync URL ?id= param with detail view — restore on refresh, update on navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    if (!orderId) return;
    const order = orders.find(o => String(o.id) === orderId);
    if (order && view !== 'details') {
      handleViewDetails(order); // fetches full order incl. attachments, transport, notif status
    }
  }, [orders]);

  // Maps backend order status names → frontend phase names
  const backendStatusToPhase: Record<string, string[]> = {
    QUOTATION:  ['Order Created', 'Weights Added', 'Quotation Generated'],
    CONFIRMED:  ['Bill Uploaded'],
    DISPATCHED: ['Partially Dispatched', 'Dispatched'],
    COMPLETED:  ['Completed'],
  };

  const seedNotifStatusFromOrder = (orderId: string, waStatus: Record<string, any>) => {
    if (!waStatus) return;
    const patch: Record<string, 'sent' | 'failed'> = {};
    for (const [backendStatus, entry] of Object.entries(waStatus)) {
      const phases = backendStatusToPhase[backendStatus] || [];
      for (const phase of phases) {
        const key = `${orderId}:${phase}`;
        patch[key] = entry?.status === 'SENT' ? 'sent' : 'failed';
      }
    }
    setNotifStatus(prev => ({ ...prev, ...patch }));
  };

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    setView('details');
    navigate(`/bookings?id=${order.id}`, { replace: true });
    try {
      const full = await fetchOrderByIdAPI(order.id);
      if (full) {
        setSelectedOrder((prev: any) => ({ ...prev, attachments: full.attachments || [] }));
        seedNotifStatusFromOrder(String(order.id), full.waNotificationStatus || {});
        // Seed transport from saved backend values
        if (full.transportBundles || full.transportRate) {
          setTransportData(prev => ({
            ...prev,
            [order.id]: {
              bundles: full.transportBundles || 0,
              rate: full.transportRate || 0,
              enabled: (full.transportBundles || 0) > 0 || (full.transportRate || 0) > 0,
            }
          }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch order details', e);
    }
  };


  const [showAddWeightsModal, setShowAddWeightsModal] = useState(false);
  const [weightsFormData, setWeightsFormData] = useState<any[]>([]);
  const [stockInEntries, setStockInEntries] = useState<any[]>([]);
  const [manualBundle, setManualBundle] = useState<Record<string, boolean>>({});
  const extraFileInputRef = useRef<HTMLInputElement>(null);
  const [addPhotoContext, setAddPhotoContext] = useState<{ orderId: string; attachmentType: string } | null>(null);

  const openWeightsModal = async (order: any) => {
    setActiveOrderId(order.id);
    setManualBundle({});

    let entries: any[] = [];
    let existingAllocs: any[] = [];
    if (!config.USE_MOCK_API) {
      try {
        const [entryRes, allocRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/stock-in?excludeOrderId=${order.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/v1/stock-in/allocations/${order.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        if (entryRes.ok) entries = await entryRes.json();
        if (allocRes.ok) existingAllocs = await allocRes.json();
      } catch (e) {
        console.error('Failed to fetch stock-in', e);
      }
    }
    setStockInEntries(entries);

    // Pre-populate stockKeys from existing allocations
    const entryMap = new Map(entries.map((e: any) => [e.id, e]));
    const allocByVariant = new Map<string, Array<{ stockKey: string; weight: string }>>();
    for (const alloc of existingAllocs) {
      const entry = entryMap.get(alloc.stockInEntryId);
      if (!entry) continue;
      const variantId = entry.productVariantId;
      if (!allocByVariant.has(variantId)) allocByVariant.set(variantId, []);
      let weight = '';
      if (entry.bundleWeights && alloc.bundleIndex >= 0) {
        const bws = entry.bundleWeights.split(',');
        weight = bws[alloc.bundleIndex]?.trim() || '';
      } else {
        weight = entry.noOfBundles > 0
          ? (entry.weightKg / entry.noOfBundles).toFixed(2)
          : String(entry.weightKg);
      }
      const stockKey = `${alloc.stockInEntryId}:${alloc.bundleIndex === -1 ? 'avg' : alloc.bundleIndex}`;
      allocByVariant.get(variantId)!.push({ stockKey, weight });
    }

    setWeightsFormData(order.itemsList.map((item: any, idx: number) => {
      // Use the live UI qty (itemQtys) when this is the currently viewed order,
      // so unsaved qty changes and post-save qty reductions are reflected in the modal.
      const uiQty = selectedOrder?.id === order.id && itemQtys[idx] != null && itemQtys[idx] !== ''
        ? Number(itemQtys[idx]) : undefined;
      const qty = (uiQty && uiQty > 0) ? uiQty : (item.qty || 1);
      const preAllocs = allocByVariant.get(item.variantId) || [];
      const weights = Array(qty).fill('').map((_: any, i: number) =>
        preAllocs[i]?.weight || (Array.isArray(item.weights) && item.weights[i] ? String(item.weights[i]) : '')
      );
      const stockKeys = Array(qty).fill('').map((_: any, i: number) => preAllocs[i]?.stockKey || '');
      return { ...item, weights, stockKeys };
    }));

    setShowAddWeightsModal(true);
  };

  const handleButtonClick = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.phase === 'Order Created') {
      // Prefer selectedOrder so openWeightsModal can pick up current itemQtys from the UI
      openWeightsModal(selectedOrder?.id === orderId ? selectedOrder : order);
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

    const untaggedCounts = weightsFormData.map(item =>
      item.weights.filter((w: any) => !(parseFloat(w) > 0)).length
    );
    const hasUntagged = untaggedCounts.some(c => c > 0);

    // Build allocation payload for backend
    const allocPayload = weightsFormData.flatMap((item: any) =>
      (item.stockKeys || []).map((key: string) => {
        if (!key) return null;
        const sepIdx = key.lastIndexOf(':');
        const stockInEntryId = key.substring(0, sepIdx);
        const bundleIndexStr = key.substring(sepIdx + 1);
        const bundleIndex = bundleIndexStr === 'avg' ? -1 : parseInt(bundleIndexStr);
        return { stockInEntryId, bundleIndex };
      }).filter(Boolean)
    );

    try {
      const payload = {
        customerId: orderToUpdate.customerId,
        items: weightsFormData.map((i: any) => {
          const itemWt = i.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0);
          return { productVariantId: i.variantId, weightKg: itemWt, bundleWeights: i.weights.join(',') };
        })
      };
      await updateOrderWeightsAPI(activeOrderId, payload);

      // Persist allocations to backend
      await fetch(`${API_BASE_URL}/api/v1/stock-in/allocations/${activeOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(allocPayload)
      });

      const grandTotalWt = weightsFormData.reduce((sum, item) =>
        sum + item.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0), 0);
      const updatedOrder = { totalWeight: `${grandTotalWt} kg`, itemsList: weightsFormData, phase: 'Quotation Generated', action: 'Upload Bill' };
      setOrders(prev => prev.map(o => o.id !== activeOrderId ? o : { ...o, ...updatedOrder }));
      if (selectedOrder?.id === activeOrderId) setSelectedOrder((prev: any) => ({ ...prev, ...updatedOrder }));

      // Backorder for untagged bundles — only if one doesn't already exist for this order
      const backorderTag = `Backorder from #${orderToUpdate.orderNumber || activeOrderId}`;
      const backorderAlreadyExists = orders.some(o => o.id !== activeOrderId && o.notes?.includes(backorderTag));
      if (hasUntagged && !backorderAlreadyExists) {
        const total = untaggedCounts.reduce((s, c) => s + c, 0);
        const backorderItems = weightsFormData
          .map((item, idx) => ({ variantId: item.variantId, qty: untaggedCounts[idx], price: item.price || 0 }))
          .filter(i => i.qty > 0);
        setDialogState({
          title: 'Untagged Bundles',
          message: `${total} bundle(s) have no weight assigned. Create a pending backorder for the untagged bundles?`,
          onConfirm: async () => {
            const backorderPayload = {
              customerId: orderToUpdate.customerId,
              notes: `Backorder from #${orderToUpdate.orderNumber || activeOrderId}`,
              items: backorderItems.map(i => ({ productVariantId: i.variantId, noOfBundles: i.qty, unitRate: i.price, lineTotal: 0 }))
            };
            const resp = await createOrderAPI(backorderPayload);
            const newOrder = {
              id: resp.id, orderNumber: resp.orderNumber, customerId: orderToUpdate.customerId,
              customer: orderToUpdate.customer, items: backorderItems.reduce((s, i) => s + i.qty, 0),
              totalWeight: 'Pending', amount: '0', phase: 'Order Created', action: 'Add Weights',
              notes: backorderTag,
              date: new Date().toISOString().split('T')[0],
              itemsList: backorderItems.map(i => ({ variantId: i.variantId, name: i.variantId, qty: i.qty, weights: Array(i.qty).fill(''), price: i.price }))
            };
            setOrders(prev => [newOrder, ...prev]);

            // Remove untagged bundles from the current order:
            // — items fully untagged → delete from current order
            // — items partially untagged → reduce noOfBundles to assigned count only
            const itemsToDelete = weightsFormData.filter((item, idx) => untaggedCounts[idx] > 0 && (item.qty - untaggedCounts[idx]) <= 0);
            const itemsToUpdate = weightsFormData.filter((item, idx) => untaggedCounts[idx] > 0 && (item.qty - untaggedCounts[idx]) > 0);

            for (const item of itemsToDelete) {
              if (item.id) {
                await fetch(`${API_BASE_URL}/api/v1/orders/${activeOrderId}/items/${item.id}`, {
                  method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });
              }
            }

            if (itemsToUpdate.length > 0 || itemsToDelete.length > 0) {
              // Rebuild the remaining items with reduced bundle counts and only assigned weights
              const remainingItems = weightsFormData
                .filter((item, idx) => (item.qty - untaggedCounts[idx]) > 0)
                .map((item, idx) => {
                  const assignedWeights = item.weights.filter((w: any) => parseFloat(w) > 0);
                  return {
                    productVariantId: item.variantId,
                    noOfBundles: item.qty - untaggedCounts[weightsFormData.indexOf(item)],
                    weightKg: assignedWeights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0),
                    bundleWeights: assignedWeights.join(','),
                    unitRate: item.price || 0,
                  };
                });

              if (remainingItems.length > 0) {
                await updateOrderWeightsAPI(String(activeOrderId), {
                  customerId: orderToUpdate.customerId,
                  items: remainingItems,
                });
              }

              // Refresh the current order in state
              const refreshed = await fetch(`${API_BASE_URL}/api/v1/orders/${activeOrderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (refreshed.ok) {
                const full = await refreshed.json();
                const newItems = (full.items || []).map((i: any) => ({
                  id: i.id, variantId: i.productVariantId, name: String(i.productVariantId),
                  qty: i.noOfBundles ?? 1,
                  weights: i.bundleWeights ? i.bundleWeights.split(',').map(Number) : [],
                  price: i.unitRate || 0,
                }));
                const patch = {
                  ...orderToUpdate,
                  items: newItems.length,
                  itemsList: newItems,
                  totalWeight: full.totalWeightKg ? `${full.totalWeightKg} kg` : 'Pending',
                  amount: `${(full.totalAmount || 0).toLocaleString()}`,
                };
                setSelectedOrder(patch);
                setOrders(prev => prev.map(o => o.id === activeOrderId ? patch : o));
              }
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
      setDialogState({ title: 'Error', message: 'Failed to save weights.' });
    }

    // Reset WA delivery ticks for all phases — weights changed, prior messages are stale
    if (activeOrderId) {
      setNotifStatus(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (k.startsWith(`${activeOrderId}:`)) delete next[k]; });
        return next;
      });
    }
    setShowAddWeightsModal(false);
    setActiveOrderId(null);
  };

  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [transportData, setTransportData] = useState<Record<string, { bundles: number; rate: number; enabled: boolean }>>({});
  const [itemPrices, setItemPrices] = useState<number[]>([]);
  const [itemQtys, setItemQtys] = useState<(number | string)[]>([]);
  const [savingPrices, setSavingPrices] = useState(false);
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState<number | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemVariantId, setNewItemVariantId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState<number>(0);

  useEffect(() => {
    if (selectedOrder?.itemsList) {
      setItemPrices(selectedOrder.itemsList.map((i: any) => i.price || 0));
      setItemQtys(selectedOrder.itemsList.map((i: any) => i.qty ?? 1));
      setSelectedPhaseIdx(null);
    }
  }, [selectedOrder?.id]);

  const handleSavePrices = async () => {
    if (!selectedOrder) return;
    const invalidQty = itemQtys.some(q => !q || Number(q) < 1);
    if (invalidQty) {
      setDialogState({ title: 'Invalid Quantity', message: 'All items must have a quantity of at least 1 bundle.' });
      return;
    }
    setSavingPrices(true);
    try {
      const transport = transportData[selectedOrder.id] ?? { bundles: 0, rate: 0, enabled: false };
      const transportTotal = transport.enabled ? (transport.bundles || 0) * (transport.rate || 0) : 0;
      const payload = {
        customerId: selectedOrder.customerId,
        transportBundles: transport.enabled ? (transport.bundles || 0) : 0,
        transportRate: transport.enabled ? (transport.rate || 0) : 0,
        items: selectedOrder.itemsList.map((item: any, idx: number) => {
          const w = Array.isArray(item.weights)
            ? item.weights.reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0)
            : (item.weightKg || 0);
          return {
            productVariantId: item.variantId,
            noOfBundles: itemQtys[idx] ?? item.qty,
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
      }, 0) + transportTotal;
      const updated = {
        ...selectedOrder,
        amount: `${newTotal.toLocaleString()}`,
        itemsList: selectedOrder.itemsList.map((item: any, idx: number) => ({ ...item, price: itemPrices[idx], qty: itemQtys[idx] ?? item.qty }))
      };
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
    } catch (e) {
      console.error('Failed to save prices', e);
      setDialogState({ title: 'Error', message: 'Failed to save prices.' });
    } finally {
      setSavingPrices(false);
    }
  };

  const handleResendToCustomer = async (phase: string) => {
    if (!selectedOrder) return;
    const notifKey = `${selectedOrder.id}:${phase}`;

    // Re-check live WA status before sending
    await checkWaStatus();
    if (!waConnected) {
      setShowWaModal(true);
      return;
    }

    if (config.WHATSAPP_TYPE !== 'none') {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/orders/${selectedOrder.id}/notify`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setNotifStatus(prev => ({ ...prev, [notifKey]: res.ok ? 'sent' : 'failed' }));
      } catch (e) {
        console.error('Failed to send WhatsApp update', e);
        setNotifStatus(prev => ({ ...prev, [notifKey]: 'failed' }));
      }
      return;
    }

    // Fallback: open WhatsApp Web
    const message = buildStatusUpdateMessage(orgName, {
      ...selectedOrder,
      itemsList: (selectedOrder.itemsList || []).map((item: any) => ({ ...item, ...getVariantInfo(item.variantId) })),
    }, phase);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    if (navigator.clipboard) navigator.clipboard.writeText(message);
    setNotifStatus(prev => ({ ...prev, [notifKey]: 'sent' }));
  };

  const handleAddItemToOrder = async () => {
    if (!selectedOrder || !newItemVariantId) return;
    const info = getVariantInfo(newItemVariantId);
    const newItem = { variantId: newItemVariantId, name: newItemVariantId, qty: newItemQty, weights: Array(newItemQty).fill(''), price: newItemPrice || info.rate };
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
      setDialogState({ title: 'Error', message: 'Failed to add product.' });
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
      if (selectedOrder?.id === orderId) { setView('list'); navigate('/bookings', { replace: true }); }
    } catch (e) {
      console.error('Failed to delete order', e);
      setDialogState({ title: 'Error', message: 'Failed to delete order.' });
    }
  };

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
      setDialogState({ title: 'Upload Failed', message: 'Upload failed. Please try again.' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeOrderId) return;
    e.target.value = '';

    const order = orders.find(o => o.id === activeOrderId);
    if (!order) return;

    const attachmentType = getAttachmentType(order.phase);
    setShowActionSheet(false);

    try {
      await uploadFiles(files, activeOrderId, attachmentType);
      await handleAction(activeOrderId);
      const full = await fetchOrderByIdAPI(activeOrderId);
      if (full) setSelectedOrder((prev: any) => ({ ...prev, attachments: full.attachments || [] }));
    } catch (err) {
      console.error('Upload failed', err);
      setDialogState({ title: 'Upload Failed', message: 'File upload failed. Please try again.' });
    } finally {
      setActiveOrderId(null);
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
      setDialogState({ title: 'Error', message: 'Failed to update order status.' });
    }
  };

  const handleShareQuotation = async (order: any) => {
    if (config.WHATSAPP_TYPE !== 'none') {
      try {
        await fetch(`${API_BASE_URL}/api/v1/orders/${order.id}/notify`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (e) {
        console.error('Failed to send WhatsApp quotation', e);
      }
      return;
    }
    // Fallback: open WhatsApp Web when no provider configured
    const message = buildQuotationMessage(orgName, {
      ...order,
      itemsList: order.itemsList.map((item: any) => ({ ...item, ...getVariantInfo(item.variantId) })),
    });

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    if (navigator.clipboard) navigator.clipboard.writeText(message);
  };

  const [orderItems, setOrderItems] = useState([
    { id: Date.now(), product: '', qty: 1, rate: 0 }
  ]);

  const handleConfirmBooking = async () => {
    if (orderItems.some(i => !i.product)) {
      setDialogState({ title: 'Missing Product', message: 'Please select a product for every item before creating the order.' });
      return;
    }

    const cust = customersList.find(c => c.id === selectedCustomer);
    const customerName = cust ? cust.name : 'Unknown Client';

    const totalQty = orderItems.reduce((sum, item) => sum + item.qty, 0);

    // Rate is per-kg and the billable weight comes from actual stock/weighing entered later.
    // At booking there is no weight yet, so weight and amount stay pending (0) until weights are added.
    const payload = {
      customerId: selectedCustomer,
      notes: "Order placed from UI",
      items: orderItems.map(item => ({
        productVariantId: item.product,
        noOfBundles: item.qty,
        weightKg: 0,
        unitRate: item.rate,
        lineTotal: 0
      }))
    };

    try {
      const response = await createOrderAPI(payload);

      const orderTotal = 0;
      const newOrder = {
        id: response.id,
        orderNumber: response.orderNumber,
        customerId: selectedCustomer,
        customer: customerName,
        customerPhone: cust?.phoneNumber || null,
        customerPlace: cust?.place || null,
        notes: response.notes || '',
        items: totalQty,
        totalWeight: `Pending`,
        amount: `${(response.totalAmount || orderTotal).toLocaleString()}`,
        phase: 'Order Created',
        action: 'Add Weights',
        date: new Date().toISOString().split('T')[0],
        itemsList: orderItems.map(item => ({
          variantId: item.product,
          name: item.product,
          qty: item.qty,
          weights: Array(item.qty).fill(''),
          price: item.rate
        }))
      };

      setOrders(prev => [newOrder, ...prev]);
      setSelectedOrder(newOrder);
      setView('details');
      setTab('pending');
      setWizardStep(1);
      setSelectedCustomer('');
      setOrderItems([{ id: Date.now(), product: '', qty: 1, rate: 0 }]);
    } catch (e) {
      console.error(e);
      setDialogState({ title: 'Error', message: 'Failed to create order.' });
    }
  };

  const handleShareEnquiry = () => {
    const cust = customersList.find(c => c.id === selectedCustomer);
    const customerName = cust ? cust.name : 'New Client';
    const message = buildEnquiryMessage(
      orgName,
      customerName,
      orderItems.map(item => ({ ...getVariantInfo(item.product), qty: item.qty, rate: item.rate })),
    );
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    if (navigator.clipboard) navigator.clipboard.writeText(message);
  };

  // Renders the list of orders based on the selected tab
  const renderList = () => {
    const today = new Date().toISOString().split('T')[0];
    const filteredOrders = orders.filter(o =>
      tab === 'pending'
        ? (o.phase !== 'Completed' || o.date < today)
        : o.phase === 'Completed'
    );

    const renderPendingStats = () => {
      if (tab !== 'pending' || filteredOrders.length === 0) return null;
      const statsMap: Record<string, { label: string; totalBundles: number; orderCount: number }> = {};
      for (const order of filteredOrders) {
        for (const item of (order.itemsList || [])) {
          if (!item.variantId) continue;
          const key = String(item.variantId);
          if (!statsMap[key]) statsMap[key] = { label: getVariantInfo(item.variantId).label, totalBundles: 0, orderCount: 0 };
          statsMap[key].totalBundles += item.qty || 0;
          statsMap[key].orderCount += 1;
        }
      }
      const entries = Object.values(statsMap).filter(s => s.totalBundles > 0).sort((a, b) => b.totalBundles - a.totalBundles);
      if (entries.length === 0) return null;
      const totalBun = entries.reduce((s, e) => s + e.totalBundles, 0);
      return (
        <details style={{ marginBottom: 'var(--space-1)' }} open={entries.length <= 5}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', userSelect: 'none' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Outstanding to Deliver
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {totalBun} bun · {entries.length} items ▾
            </span>
          </summary>
          <div style={{ borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)', borderTop: 'none' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Product · Size</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Bun</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Orders</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((s, i) => (
                  <tr key={i} style={{ borderBottom: i < entries.length - 1 ? '1px solid var(--color-border)' : 'none', background: i % 2 === 0 ? 'white' : 'var(--color-surface-muted)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600, fontSize: '0.88rem' }}>{s.label}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem' }}>{s.totalBundles}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{s.orderCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-muted)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, fontSize: '0.9rem' }}>Total</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem' }}>{totalBun}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </details>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {renderPendingStats()}
        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
          <Card 
            key={order.id} 
            onClick={() => handleViewDetails(order)}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Order #{order.id}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                  {order.customer}{order.customerPhone ? ` • ${order.customerPhone}` : ''} • <strong style={{ color: 'var(--color-text-main)', fontWeight: 700 }}>{order.itemsList?.reduce((s: number, i: any) => s + (i.qty || 0), 0) || order.items} Bun</strong>
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 700 }}>
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
                <div key={idx} style={{ padding: 'var(--space-3)', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>
                  {(() => { const info = getVariantInfo(item.variantId); return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{info.label}</div>
                        {isEditable && item.id && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Remove ${info.label} from this order?`)) return;
                              try {
                                const res = await fetch(`${API_BASE_URL}/api/v1/orders/${selectedOrder.id}/items/${item.id}`, {
                                  method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  const updated = await res.json();
                                  const newItems = (updated.items || []).map((i: any) => ({
                                    id: i.id, variantId: i.productVariantId, name: String(i.productVariantId),
                                    qty: i.noOfBundles ?? 1, weights: i.bundleWeights ? i.bundleWeights.split(',').map(Number) : [], price: i.unitRate || 0
                                  }));
                                  const newTotal = `${(updated.totalAmount || 0).toLocaleString()}`;
                                  const patch = { ...selectedOrder, itemsList: newItems, items: newItems.length, amount: newTotal };
                                  setSelectedOrder(patch);
                                  setOrders(prev => prev.map(o => o.id === selectedOrder.id ? patch : o));
                                  setItemPrices(newItems.map((i: any) => i.price || 0));
                                  setItemQtys(newItems.map((i: any) => i.qty || 1));
                                }
                              } catch (e) { console.error('Failed to remove item', e); }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fa5252', fontSize: '1rem', padding: '0 2px', lineHeight: 1 }}
                            title="Remove product"
                          >×</button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                        {info.gsm && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{info.gsm} GSM</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Input
                            type="number"
                            value={itemQtys[idx] ?? item.qty ?? 1}
                            onChange={(e) => setItemQtys(prev => { const n = [...prev]; n[idx] = e.target.value === '' ? '' : parseInt(e.target.value); return n; })}
                            style={{ width: '52px', height: '26px', padding: '1px 6px', fontSize: '0.8rem', display: 'inline-block' }}
                          />
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>bun</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                          <Input
                            type="number"
                            value={itemPrices[idx] ?? item.price ?? 0}
                            onChange={(e) => setItemPrices(prev => { const n = [...prev]; n[idx] = parseFloat(e.target.value) || 0; return n; })}
                            style={{ width: '70px', height: '26px', padding: '1px 6px', fontSize: '0.8rem', display: 'inline-block' }}
                          />
                        </div>
                      </div>
                    </>
                  ); })()}
                </div>
              ))}

              {showAddItemForm ? (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%', boxSizing: 'border-box' }}>
                  <ProductVariantPicker
                    productsList={productsList}
                    value={newItemVariantId}
                    onChange={(id) => { setNewItemVariantId(String(id)); setNewItemPrice(getVariantInfo(id).rate); }}
                    placeholder="Select product..."
                    style={{ fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Qty</label>
                    <Input
                      type="number"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                      style={{ flex: 1, height: '32px', fontSize: '0.85rem' }}
                    />
                    <Input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                      style={{ flex: 1, height: '32px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="outline" style={{ flex: 1, fontSize: '0.8rem', padding: 'var(--space-2)' }} onClick={() => { setShowAddItemForm(false); setNewItemVariantId(''); setNewItemQty(1); setNewItemPrice(0); }}>Cancel</Button>
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
              {(() => {
                const transport = transportData[selectedOrder.id] ?? { bundles: 0, rate: 0, enabled: false };
                const setTransport = (patch: Partial<typeof transport>) =>
                  setTransportData(prev => ({ ...prev, [selectedOrder.id]: { ...transport, ...patch } }));
                const itemsTotal = selectedOrder.itemsList?.reduce((sum: number, item: any, idx: number) => {
                  const wt = Array.isArray(item.weights) ? item.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0) : (item.weightKg || 0);
                  return sum + wt * (itemPrices[idx] ?? item.price ?? 0);
                }, 0) ?? 0;
                const transportTotal = transport.enabled ? (transport.bundles || 0) * (transport.rate || 0) : 0;
                const grandTotal = itemsTotal + transportTotal;
                return (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {selectedOrder.itemsList?.map((item: any, idx: number) => {
                  const unitPrice = itemPrices[idx] ?? item.price ?? 0;
                  const totalWt = Array.isArray(item.weights)
                    ? item.weights.reduce((s: number, w: any) => s + (parseFloat(w) || 0), 0)
                    : (item.weightKg || 0);
                  return (
                    <div key={idx} style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                          {getVariantInfo(item.variantId).label}
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', marginLeft: '6px' }}>{item.qty} Bun</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span onClick={() => openWeightsModal(selectedOrder)} style={{ cursor: 'pointer', color: 'var(--color-primary)', borderBottom: '1px dashed var(--color-primary)' }}>
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
                      <span style={{ fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        ₹{(totalWt * unitPrice).toLocaleString()}
                      </span>
                    </div>
                  );
                })}

                {/* Transportation line */}
                {transport.enabled ? (
                  <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Transportation
                        <button onClick={() => setTransport({ enabled: false, bundles: 0, rate: 0 })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--color-text-muted)', padding: 0, lineHeight: 1 }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <Input
                          type="number" placeholder="Bundles"
                          value={transport.bundles || ''}
                          onChange={(e) => setTransport({ bundles: parseInt(e.target.value) || 0 })}
                          style={{ width: '72px', height: '24px', padding: '1px 4px', fontSize: '0.75rem', display: 'inline-block' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>bundles ×</span>
                        <Input
                          type="number" placeholder="₹/bundle"
                          value={transport.rate || ''}
                          onChange={(e) => setTransport({ rate: parseFloat(e.target.value) || 0 })}
                          style={{ width: '72px', height: '24px', padding: '1px 4px', fontSize: '0.75rem', display: 'inline-block' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>/bundle</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>₹{transportTotal.toLocaleString()}</span>
                  </div>
                ) : isEditable && (
                  <button
                    onClick={() => {
                      const totalBundles = selectedOrder.itemsList?.reduce((s: number, i: any) => s + (i.qty || 0), 0) || 0;
                      setTransport({ enabled: true, bundles: totalBundles });
                    }}
                    style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)', padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--color-primary)', textAlign: 'left' }}
                  >
                    + Add Transportation
                  </button>
                )}

                <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-muted)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>₹{grandTotal.toLocaleString()}</span>
                </div>
              </Card>
                );
              })()}
              {isEditable && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="outline" onClick={handleSavePrices} disabled={savingPrices} style={{ fontSize: '0.8rem', flex: 1 }}>
                    {savingPrices ? 'Saving...' : 'Save Prices'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openWeightsModal(selectedOrder)}
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
          {!isFuture && (() => {
            const notifKey = `${selectedOrder.id}:${phase.phase}`;
            const status = notifStatus[notifKey];
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <button
                  onClick={() => handleResendToCustomer(phase.phase)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
                >
                  <Share2 size={14} />
                  {status === 'failed' ? 'Retry WhatsApp' : status === 'sent' ? 'Resend WhatsApp' : 'Send WhatsApp Update'}
                </button>
                {status === 'sent' && (
                  <span title="Sent" style={{ color: '#2f9e44', fontSize: '1rem', fontWeight: 700 }}>✓</span>
                )}
                {status === 'failed' && (
                  <span title="Failed to send" style={{ color: '#fa5252', fontSize: '1rem', fontWeight: 700 }}>✗</span>
                )}
                {waConnected === false && (
                  <span style={{ fontSize: '0.72rem', color: '#fa5252' }}>WhatsApp not connected</span>
                )}
              </div>
            );
          })()}

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
          <button onClick={() => { setView('list'); navigate('/bookings', { replace: true }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
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
              {' · '}{selectedOrder.items} Bun · {selectedOrder.date}
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
                      setSelectedPhaseIdx(i);
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
          <Badge status="upcoming">Step {wizardStep} of 2</Badge>
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
                        setDialogState({ title: 'Error', message: 'Failed to create customer.' });
                      }
                    } catch (e) {
                      console.error(e);
                      setDialogState({ title: 'Error', message: 'Failed to create customer.' });
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
              <div key={item.id} style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', position: 'relative' }}>
                {orderItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOrderItems(prev => prev.filter(i => i.id !== item.id))}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#fa5252', fontSize: '1.1rem', lineHeight: 1, padding: '2px 6px' }}
                    title="Remove product"
                  >×</button>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Product</label>
                    <ProductVariantPicker
                      productsList={productsList}
                      value={item.product}
                      onChange={(id) => updateItem(item.id, 'product', String(id))}
                      placeholder="Select a product..."
                    />
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
              <Button variant="primary" onClick={handleConfirmBooking} style={{ flex: 2 }} disabled={orderItems.some(i => !i.product)}>Confirm & Create Order</Button>
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

      {/* Generic Dialog */}
      {dialogState && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem' }}>{dialogState.title}</h3>
            <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{dialogState.message}</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="outline" style={{ flex: 1 }} onClick={() => setDialogState(null)}>
                {dialogState.onConfirm ? 'No' : 'OK'}
              </Button>
              {dialogState.onConfirm && (
                <Button variant="primary" style={{ flex: 1 }} onClick={() => { dialogState.onConfirm!(); setDialogState(null); }}>
                  Yes
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Not Connected Modal */}
      {showWaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: '320px', width: '100%' }}>
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 'var(--space-3)' }}>📵</div>
            <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: '1rem', textAlign: 'center' }}>WhatsApp Not Connected</h3>
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? (
              <>
                <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Scan the QR code in Settings to link your WhatsApp account.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowWaModal(false)}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => { setShowWaModal(false); navigate('/profile?tab=whatsapp'); }}>Go to Settings</Button>
                </div>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 var(--space-5) 0', fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  WhatsApp is not connected. Please ask your admin to link WhatsApp in Settings.
                </p>
                <Button variant="primary" style={{ width: '100%' }} onClick={() => setShowWaModal(false)}>OK</Button>
              </>
            )}
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
              {selectedOrder?.customerPhone && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Phone</label>
                  <div style={{ fontWeight: 600 }}>{selectedOrder.customerPhone}</div>
                </div>
              )}
              {selectedOrder?.customerPlace && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Place / Address</label>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedOrder.customerPlace}</div>
                </div>
              )}
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
          <Card style={{ width: '100%', maxWidth: '440px', padding: 'var(--space-6)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--space-1)' }}>Add Bundle Weights</h3>
            {stockInEntries.length > 0 && (
              <p style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Select from stock-in or type manually for each bundle.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {(() => {
                // Build set of stock keys consumed by OTHER orders (from backend allocatedBundleIndices)
                // The stock entries were fetched with excludeOrderId so they already exclude the current order
                const consumedByOthers = new Set<string>();
                stockInEntries.forEach((entry: any) => {
                  (entry.allocatedBundleIndices || []).forEach((bi: number) => {
                    consumedByOthers.add(`${entry.id}:${bi === -1 ? 'avg' : bi}`);
                  });
                });
                // Build set of stock keys already selected within THIS modal (across all bundles)
                const selectedInModal = new Set(
                  weightsFormData.flatMap(item => (item.stockKeys || []).filter(Boolean))
                );
                return weightsFormData.map((item, itemIdx) => (
                <div key={itemIdx}>
                  <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: '0.9rem' }}>{getVariantInfo(item.variantId).label} · {item.qty} Bun</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {item.weights.map((w: any, wIdx: number) => {
                      const key = `${itemIdx}-${wIdx}`;
                      const isManual = manualBundle[key];
                      const currentStockKey = (item.stockKeys || [])[wIdx] || '';
                      return (
                        <div key={wIdx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', minWidth: '28px' }}>#{wIdx + 1}</span>
                          {stockInEntries.length > 0 && !isManual ? (
                            <select
                              className="input-field"
                              value={currentStockKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__manual__') {
                                  setManualBundle(prev => ({ ...prev, [key]: true }));
                                  const newForm = weightsFormData.map(it => ({ ...it, weights: [...it.weights], stockKeys: [...(it.stockKeys || [])] }));
                                  newForm[itemIdx].weights[wIdx] = '';
                                  newForm[itemIdx].stockKeys[wIdx] = '';
                                  setWeightsFormData(newForm);
                                } else if (val) {
                                  const [weight, stockKey] = val.split('|');
                                  const newForm = weightsFormData.map(it => ({ ...it, weights: [...it.weights], stockKeys: [...(it.stockKeys || Array(it.qty).fill(''))] }));
                                  newForm[itemIdx].weights[wIdx] = weight;
                                  newForm[itemIdx].stockKeys[wIdx] = stockKey;
                                  setWeightsFormData(newForm);
                                } else {
                                  const newForm = weightsFormData.map(it => ({ ...it, weights: [...it.weights], stockKeys: [...(it.stockKeys || [])] }));
                                  newForm[itemIdx].weights[wIdx] = '';
                                  newForm[itemIdx].stockKeys[wIdx] = '';
                                  setWeightsFormData(newForm);
                                }
                              }}
                              style={{ flex: 1, fontSize: '0.85rem' }}
                            >
                              <option value="">— Select from Stock-In —</option>
                              {stockInEntries.filter((e: any) => e.productVariantId === item.variantId).flatMap((entry: any) => {
                                const label = entry.type || String(entry.productVariantId) || 'Stock';
                                const date = new Date(entry.entryDate).toLocaleDateString();
                                if (entry.bundleWeights) {
                                  return entry.bundleWeights.split(',').map((bw: string, i: number) => {
                                    const stockKey = `${entry.id}:${i}`;
                                    const isConsumed = (consumedByOthers.has(stockKey) || selectedInModal.has(stockKey)) && currentStockKey !== stockKey;
                                    if (isConsumed) return null;
                                    return (
                                      <option key={stockKey} value={`${bw.trim()}|${stockKey}`}>
                                        {bw.trim()} kg — {label} #{i + 1} ({date})
                                      </option>
                                    );
                                  }).filter(Boolean);
                                }
                                const stockKey = `${entry.id}:avg`;
                                const isConsumed = (consumedByOthers.has(stockKey) || selectedInModal.has(stockKey)) && currentStockKey !== stockKey;
                                if (isConsumed) return null;
                                const perBundle = entry.noOfBundles > 0
                                  ? (entry.weightKg / entry.noOfBundles).toFixed(2)
                                  : entry.weightKg;
                                return (
                                  <option key={stockKey} value={`${perBundle}|${stockKey}`}>
                                    {perBundle} kg — {label} ({date})
                                  </option>
                                );
                              })}
                              <option value="__manual__">Enter manually…</option>
                            </select>
                          ) : (
                            <Input
                              type="number"
                              placeholder="kg"
                              step="0.01"
                              style={{ flex: 1, height: '36px' }}
                              value={w}
                              onChange={(e) => {
                                const newForm = weightsFormData.map(it => ({ ...it, weights: [...it.weights] }));
                                newForm[itemIdx].weights[wIdx] = e.target.value;
                                setWeightsFormData(newForm);
                              }}
                              autoFocus={isManual}
                            />
                          )}
                          {isManual && (
                            <button
                              type="button"
                              onClick={() => setManualBundle(prev => ({ ...prev, [key]: false }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '2px 4px' }}
                            >
                              ↩
                            </button>
                          )}
                          {w && !isManual && (
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>{w} kg</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
              })()}
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
        }} onClick={() => { setShowActionSheet(false); }}>
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
            { label: 'Pending', value: 'pending' },
            { label: 'Completed', value: 'completed' },
          ]}
          value={tab === 'new' ? 'pending' : tab}
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
