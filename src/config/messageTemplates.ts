export interface TemplateItem {
  variantId: string | number;
  qty: number;
  weights?: (string | number)[];
  weightKg?: number;
  price?: number;
  label: string;
  gsm?: number | null;
}

export interface TemplateOrder {
  id: string;
  orderNumber?: string;
  customer: string;
  date: string;
  amount: string;
  totalWeight?: string;
  itemsList: TemplateItem[];
}

// Enquiry / pre-booking quote (Step 3 of create wizard)
export const buildEnquiryMessage = (
  orgName: string,
  customerName: string,
  items: Array<{ label: string; gsm?: number | null; qty: number; rate: number }>,
): string => {
  const itemsText = items.map(item => {
    const rateStr = item.rate > 0 ? `Rate: ₹${item.rate}/kg` : 'Rate: TBD';
    const lineTotal = item.qty * item.rate;
    const totalStr = lineTotal > 0 ? ` | Amt: ₹${lineTotal.toLocaleString()}` : '';
    return `${item.label}\nBun: ${item.qty} | ${rateStr}${totalStr}`;
  }).join('\n\n');

  const grandTotal = items.reduce((sum, i) => sum + i.qty * i.rate, 0);

  return (
    `*${orgName} — Enquiry*\n` +
    `Party: ${customerName}\n` +
    `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
    `${itemsText}\n\n` +
    `*Est. Total: ₹${grandTotal.toLocaleString()}*\n` +
    `_Rates subject to confirmation._`
  );
};

// Quotation share (order detail — Share Quotation button)
export const buildQuotationMessage = (orgName: string, order: TemplateOrder): string => {
  const itemsText = order.itemsList.map(item => {
    const weights = Array.isArray(item.weights)
      ? item.weights.map(w => parseFloat(w as any) || 0).filter(w => w > 0)
      : [];
    const totalWt = weights.length > 0
      ? weights.reduce((a, b) => a + b, 0)
      : (item.weightKg || 0);
    const rate = item.price || 0;
    const lineTotal = totalWt * rate;

    const wtLine = weights.length > 0
      ? `Wt: ${weights.join('. ')} kg`
      : totalWt > 0 ? `Wt: ${totalWt} kg` : `Wt: Pending`;
    const rateStr = rate > 0 ? `Rate: ₹${rate}/kg | Amt: ₹${lineTotal.toLocaleString()}` : `Rate: TBD`;

    return `${item.label}\nBun: ${item.qty} | ${wtLine}\n${rateStr}`;
  }).join('\n\n');

  return (
    `*${orgName} — Quotation #${order.orderNumber || order.id}*\n` +
    `Party: ${order.customer}\n` +
    `Date: ${order.date}\n\n` +
    `${itemsText}\n\n` +
    `*Total: ₹${order.amount}*\n\n` +
    `_Please reply to confirm._`
  );
};

// Per-phase status update (Send Update to Customer)
export const buildStatusUpdateMessage = (
  orgName: string,
  order: TemplateOrder,
  phase: string,
): string => {
  const itemsText = order.itemsList.map(item => {
    const weights = Array.isArray(item.weights)
      ? item.weights.map(w => parseFloat(w as any) || 0).filter(w => w > 0)
      : [];
    const totalWt = weights.length > 0
      ? weights.reduce((a, b) => a + b, 0)
      : (item.weightKg || 0);
    const rate = item.price || 0;
    const lineTotal = totalWt * rate;

    const wtLine = weights.length > 0
      ? `Wt: ${weights.join('. ')} kg`
      : totalWt > 0 ? `Wt: ${totalWt} kg` : `Wt: Pending`;
    const rateStr = rate > 0 ? `Rate: ₹${rate}/kg | Amt: ₹${lineTotal.toLocaleString()}` : '';

    return `${item.label}\nBun: ${item.qty} | ${wtLine}${rateStr ? `\n${rateStr}` : ''}`;
  }).join('\n\n');

  const statusLines: Record<string, string> = {
    'Order Created':        `Status: Order created ✓\nWeights will be added shortly.`,
    'Weights Added':        `Status: Weights recorded ✓\nTotal Wt: ${order.totalWeight}`,
    'Quotation Generated':  `Status: Quotation ready ✓\n\n_Please reply to confirm._`,
    'Bill Uploaded':        `Status: Bill prepared ✓\n\n_Contact us for any queries._`,
    'Partially Dispatched': `Status: Partial dispatch done ✓`,
    'Dispatched':           `Status: Order dispatched ✓`,
    'Completed':            `Status: Order complete ✓\nThank you for your business!`,
  };

  return (
    `*${orgName} — Order #${order.orderNumber || order.id}*\n` +
    `Party: ${order.customer}\n` +
    `Date: ${order.date}\n\n` +
    `${itemsText}\n\n` +
    `*Total: ₹${order.amount}*\n\n` +
    (statusLines[phase] ?? `Status: ${phase}`) +
    `\n\n_${orgName}_`
  );
};
