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
    const gsmStr = item.gsm ? ` | ${item.gsm} GSM` : '';
    const rateStr = item.rate > 0 ? ` | ₹${item.rate}/kg` : '';
    const lineTotal = item.qty * item.rate;
    const totalStr = lineTotal > 0 ? ` → ₹${lineTotal.toLocaleString()}` : '';
    return `• ${item.label}${gsmStr}\n  ${item.qty} Bundles${rateStr}${totalStr}`;
  }).join('\n');

  const grandTotal = items.reduce((sum, i) => sum + i.qty * i.rate, 0);

  return (
    `*${orgName} — Enquiry / Quotation Template*\n` +
    `Customer: ${customerName}\n` +
    `Date: ${new Date().toLocaleDateString()}\n\n` +
    `*Proposed Items:*\n${itemsText}\n\n` +
    `*Estimated Total: ₹${grandTotal.toLocaleString()}*\n\n` +
    `_This is a pre-booking enquiry. Final rates subject to confirmation._`
  );
};

// Quotation share (order detail — Share Quotation button)
export const buildQuotationMessage = (orgName: string, order: TemplateOrder): string => {
  const itemsText = order.itemsList.map(item => {
    const totalWt = Array.isArray(item.weights)
      ? item.weights.reduce((a, b) => a + (parseFloat(b as any) || 0), 0)
      : (item.weightKg || 0);
    const gsmStr = item.gsm ? ` | ${item.gsm} GSM` : '';
    const wtStr = totalWt > 0 ? `${totalWt} kg` : 'Weight pending';
    const rate = item.price || 0;
    const lineTotal = totalWt * rate;
    const rateStr = rate > 0 ? ` × ₹${rate}/kg = ₹${lineTotal.toLocaleString()}` : '';
    return `• ${item.label}${gsmStr}\n  ${item.qty} Bundles | ${wtStr}${rateStr}`;
  }).join('\n');

  return (
    `*${orgName} Quotation — #${order.orderNumber || order.id}*\n` +
    `Customer: ${order.customer}\n` +
    `Date: ${order.date}\n\n` +
    `*Items:*\n${itemsText}\n\n` +
    `*Total Amount: ${order.amount}*\n\n` +
    `_Please reply to confirm. Generated via ${orgName} Portal._`
  );
};

// Per-phase status update (Send Update to Customer)
export const buildStatusUpdateMessage = (
  orgName: string,
  order: TemplateOrder,
  phase: string,
): string => {
  const itemsText = order.itemsList.map(item => {
    const totalWt = Array.isArray(item.weights)
      ? item.weights.reduce((a, b) => a + (parseFloat(b as any) || 0), 0)
      : (item.weightKg || 0);
    const gsmStr = item.gsm ? ` | ${item.gsm} GSM` : '';
    const wtStr = totalWt > 0 ? `${totalWt} kg` : 'Weight pending';
    const rate = item.price || 0;
    const lineTotal = totalWt * rate;
    const rateStr = rate > 0 ? ` × ₹${rate}/kg = ₹${lineTotal.toLocaleString()}` : '';
    return `• ${item.label}${gsmStr}\n  ${item.qty} Bundles | ${wtStr}${rateStr}`;
  }).join('\n');

  const statusLines: Record<string, string> = {
    'Order Created':       `Status: Order has been created. Weights to be added shortly.`,
    'Weights Added':       `Status: Weights recorded.\nTotal Weight: ${order.totalWeight}`,
    'Quotation Generated': `Status: Quotation is ready.\n\n_Please reply to confirm._`,
    'Bill Uploaded':       `Status: Bill has been prepared.\n\n_Contact us for any queries._`,
    'Partially Dispatched':`Status: Partial shipment dispatched.`,
    'Dispatched':          `Status: Order fully dispatched.`,
    'Completed':           `Status: Order complete. Thank you for your business!`,
  };

  return (
    `*${orgName} Order Update — #${order.orderNumber || order.id}*\n` +
    `Customer: ${order.customer}\n` +
    `Date: ${order.date}\n\n` +
    `*Items:*\n${itemsText}\n\n` +
    `*Total: ${order.amount}*\n\n` +
    (statusLines[phase] ?? `Status: ${phase}`) +
    `\n\n_${orgName} Portal_`
  );
};
