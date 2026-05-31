import { useState, useEffect } from 'react';
import { Users, Package, ArrowUpRight, ArrowDownLeft, Layers, Search } from 'lucide-react';
import { Card } from '../design-system/components/ui/Card';
import { Badge } from '../design-system/components/ui/Badge';
import { Input } from '../design-system/components/ui/Input';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { useAuth } from '../contexts/AuthContext';

/* ───────────────────── tiny helpers ───────────────────── */
const fmt = (n: number) => `${Math.round(n * 100) / 100}`;
const pct = (num: number, den: number) => den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '—';

export const Reports = () => {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const [tab, setTab] = useState('overview');
  const [productSearch, setProductSearch] = useState('');
  const [rmSearch, setRmSearch] = useState('');
  const [expandedRmRow, setExpandedRmRow] = useState<string | null>(null);

  // overview
  const [stats, setStats] = useState<{ totalCustomers: number; todayOrdersCount: number } | null>(null);
  const [pendingTiles, setPendingTiles] = useState<Array<{ label: string; totalBundles: number; orderCount: number }>>([]);

  // products tab
  const [stockRows, setStockRows] = useState<any[]>([]);

  // raw materials tab
  const [rmInOut, setRmInOut] = useState<Array<{ name: string; inKg: number; outKg: number; netKg: number }>>([]);
  const [rmInventory, setRmInventory] = useState<Record<string, { availableKg: number; rolls: number; variants: Array<{ size: string; availableKg: number; rolls: number }> }>>({});

  useEffect(() => {
    // ── Overview stats ──
    fetch(`${API_BASE_URL}/api/v1/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); }).catch(() => {});

    // ── Products & stock ──
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/stock-in`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/v1/orders`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/v1/products?includeInactive=true`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([stockEntries, orders, products]) => {
      const stockByVariant: Record<string, number> = {};
      stockEntries.forEach((s: any) => { stockByVariant[s.productVariantId] = (stockByVariant[s.productVariantId] || 0) + (s.noOfBundles || 0); });

      const demandByVariant: Record<string, number> = {};
      orders.filter((o: any) => o.statusName !== 'COMPLETED')
        .forEach((o: any) => { (o.items || []).forEach((i: any) => { demandByVariant[i.productVariantId] = (demandByVariant[i.productVariantId] || 0) + (i.noOfBundles || 0); }); });

      const rows: any[] = [];
      products.forEach((p: any) => {
        (p.variants || []).forEach((v: any) => {
          const stock = stockByVariant[v.id] || 0;
          const demand = demandByVariant[v.id] || 0;
          if (stock > 0 || demand > 0)
            rows.push({ item: `${p.name} • ${v.size || ''}`.trim(), gsm: v.gsm, stock, demand, status: demand > stock ? 'Short' : stock > demand * 1.5 ? 'Surplus' : 'OK' });
        });
      });
      setStockRows(rows.sort((a, b) => b.stock - a.stock));

      // pending tiles
      const today = new Date().toISOString().split('T')[0];
      const statsMap: Record<string, { label: string; totalBundles: number; orderCount: number }> = {};
      orders.filter((o: any) => { const d = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : today; return o.statusName !== 'COMPLETED' || d < today; })
        .forEach((o: any) => {
          (o.items || []).forEach((i: any) => {
            if (!i.productVariantId) return;
            const key = String(i.productVariantId);
            let label = key;
            for (const p of products) { const v = p.variants?.find((v: any) => String(v.id) === key); if (v) { label = `${p.name} • ${v.size ?? ''}`; break; } }
            if (!statsMap[key]) statsMap[key] = { label, totalBundles: 0, orderCount: 0 };
            statsMap[key].totalBundles += i.noOfBundles || 0;
            statsMap[key].orderCount += 1;
          });
        });
      setPendingTiles(Object.values(statsMap).filter(s => s.totalBundles > 0));
    }).catch(() => {});

    // ── Raw materials ──
    Promise.all([
      fetch(`${API_BASE_URL}/api/v1/raw-materials`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/v1/raw-material-out`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE_URL}/api/v1/raw-materials/inventory`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([inEntries, outEntries, inventory]) => {
      const byType: Record<string, { inKg: number; outKg: number }> = {};
      inEntries.forEach((e: any) => { const n = e.materialTypeName || 'Unknown'; if (!byType[n]) byType[n] = { inKg: 0, outKg: 0 }; byType[n].inKg += e.weightKg || 0; });
      outEntries.forEach((e: any) => { const n = e.materialTypeName || 'Unknown'; if (!byType[n]) byType[n] = { inKg: 0, outKg: 0 }; byType[n].outKg += e.weightKg || 0; });
      setRmInOut(Object.entries(byType).map(([name, v]) => ({ name, inKg: +fmt(v.inKg), outKg: +fmt(v.outKg), netKg: +fmt(v.inKg - v.outKg) })).sort((a, b) => b.inKg - a.inKg));

      // inventory grouped by type, with variant drill-down
      const inv: Record<string, { availableKg: number; rolls: number; variants: any[] }> = {};
      inventory.forEach((i: any) => {
        const n = i.materialTypeName || 'Unknown';
        if (!inv[n]) inv[n] = { availableKg: 0, rolls: 0, variants: [] };
        inv[n].availableKg += i.availableWeightKg || 0;
        inv[n].rolls += i.availableRolls || 0;
        inv[n].variants.push({ size: i.size || '—', availableKg: i.availableWeightKg || 0, rolls: i.availableRolls || 0 });
      });
      Object.values(inv).forEach(v => { v.availableKg = +fmt(v.availableKg); });
      setRmInventory(inv);
    }).catch(() => {});
  }, [token]);

  // ── Filtered rows ──
  const filteredStock = stockRows.filter(r =>
    !productSearch || r.item.toLowerCase().includes(productSearch.toLowerCase()) || String(r.gsm).includes(productSearch)
  );
  const filteredRmInOut = rmInOut.filter(r => !rmSearch || r.name.toLowerCase().includes(rmSearch.toLowerCase()));
  const filteredRmInv = Object.entries(rmInventory).filter(([name]) => !rmSearch || name.toLowerCase().includes(rmSearch.toLowerCase()));

  const statusColor = (s: string) => s === 'Short' ? '#fa5252' : s === 'Surplus' ? '#2f9e44' : 'var(--color-text-muted)';

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <header style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>Reports</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Live inventory and production analytics.</p>
      </header>

      <SegmentedControl
        options={[{ label: 'Overview', value: 'overview' }, { label: 'Products', value: 'products' }, { label: 'Raw Materials', value: 'rm' }]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 'var(--space-5)' }}>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <Card style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                  <Users size={14} /><span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Customers</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{stats?.totalCustomers ?? '—'}</h2>
              </Card>
              <Card style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                  <Package size={14} /><span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Today's Orders</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{stats?.todayOrdersCount ?? '—'}</h2>
              </Card>
            </div>

            {pendingTiles.length > 0 && (
              <section style={{ marginBottom: 'var(--space-5)' }}>
                <p style={{ margin: '0 0 var(--space-2)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pending Deliveries
                  <span style={{ marginLeft: '8px', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                    {pendingTiles.reduce((s, t) => s + t.totalBundles, 0)} bun · {pendingTiles.length} items
                  </span>
                </p>
                <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={thStyle}>Product · Size</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Bun</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTiles.sort((a, b) => b.totalBundles - a.totalBundles).map((s, i) => (
                        <tr key={i} style={{ borderBottom: i < pendingTiles.length - 1 ? '1px solid var(--color-border)' : 'none', background: i % 2 === 0 ? 'white' : 'var(--color-surface-muted)' }}>
                          <td style={{ ...tdStyle, fontWeight: 600, fontSize: '0.88rem' }}><strong>{s.label}</strong></td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem' }}>{s.totalBundles}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{s.orderCount}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-muted)', fontWeight: 700 }}>
                        <td style={{ ...tdStyle, fontSize: '0.9rem' }}>Total</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-primary)', fontSize: '1rem' }}>{pendingTiles.reduce((s, t) => s + t.totalBundles, 0)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {Object.keys(rmInventory).length > 0 && (
              <section>
                <p style={{ margin: '0 0 var(--space-2)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Raw Material Stock
                  <span style={{ marginLeft: '8px', fontWeight: 400, color: 'var(--color-primary)' }}>
                    {fmt(Object.values(rmInventory).reduce((s, v) => s + v.availableKg, 0))} kg
                  </span>
                </p>
                <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={thStyle}>Material</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Available (kg)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Rolls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rmInventory).sort(([, a], [, b]) => b.availableKg - a.availableKg).map(([name, v], i, arr) => (
                        <tr key={name} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none', background: i % 2 === 0 ? 'white' : 'var(--color-surface-muted)' }}>
                          <td style={tdStyle}><strong>{name}</strong></td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{v.availableKg}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>{v.rolls}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-muted)', fontWeight: 700 }}>
                        <td style={tdStyle}>Total ({Object.keys(rmInventory).length} types)</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-primary)' }}>{fmt(Object.values(rmInventory).reduce((s, v) => s + v.availableKg, 0))}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{Object.values(rmInventory).reduce((s, v) => s + v.rolls, 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {Object.keys(rmInventory).length > 6 && (
                  <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', cursor: 'pointer' }} onClick={() => setTab('rm')}>
                    View drill-down by size → Raw Materials tab
                  </p>
                )}
              </section>
            )}
          </>
        )}

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <>
            <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <Input
                type="text"
                placeholder="Filter by product name or GSM..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>

            {filteredStock.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)', fontSize: '0.9rem' }}>
                {productSearch ? 'No products match your search.' : 'No stock data available.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={thStyle}>Product · Size</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>GSM</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Stock</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Demand</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Surplus</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((row, i) => {
                      const surplus = row.stock - row.demand;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'white' : 'var(--color-surface-muted)' }}>
                          <td style={tdStyle}><strong>{row.item}</strong></td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>{row.gsm ?? '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{row.stock}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: row.demand > row.stock ? '#fa5252' : 'inherit', fontWeight: 600 }}>{row.demand}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: surplus < 0 ? '#fa5252' : '#2f9e44', fontWeight: 700 }}>{surplus > 0 ? '+' : ''}{surplus}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor(row.status), background: row.status === 'Short' ? '#fff5f5' : row.status === 'Surplus' ? '#ebfbee' : 'var(--color-surface-muted)', padding: '2px 8px', borderRadius: '12px' }}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--color-surface-muted)', borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                      <td style={tdStyle} colSpan={2}>Total ({filteredStock.length} items)</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{filteredStock.reduce((s, r) => s + r.stock, 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{filteredStock.reduce((s, r) => s + r.demand, 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{filteredStock.reduce((s, r) => s + r.stock - r.demand, 0) > 0 ? '+' : ''}{filteredStock.reduce((s, r) => s + r.stock - r.demand, 0)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── RAW MATERIALS TAB ── */}
        {tab === 'rm' && (
          <>
            <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <Input
                type="text"
                placeholder="Filter by material name..."
                value={rmSearch}
                onChange={e => setRmSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>

            {/* IN vs OUT table */}
            <p style={{ margin: '0 0 var(--space-2)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowDownLeft size={13} /> In vs Out
            </p>
            {filteredRmInOut.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6)', fontSize: '0.9rem' }}>No raw material entries yet.</p>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 'var(--space-6)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={thStyle}>Material Type</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>In (kg)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Out (kg)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Net (kg)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>% Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRmInOut.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'white' : 'var(--color-surface-muted)' }}>
                        <td style={tdStyle}><strong>{row.name}</strong></td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#2f9e44', fontWeight: 700 }}>{row.inKg}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#fa5252', fontWeight: 600 }}>{row.outKg}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: row.netKg < 0 ? '#fa5252' : 'var(--color-primary)' }}>{row.netKg}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>{pct(row.outKg, row.inKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--color-surface-muted)', borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                      <td style={tdStyle}>Total ({filteredRmInOut.length})</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#2f9e44' }}>{fmt(filteredRmInOut.reduce((s, r) => s + r.inKg, 0))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#fa5252' }}>{fmt(filteredRmInOut.reduce((s, r) => s + r.outKg, 0))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-primary)' }}>{fmt(filteredRmInOut.reduce((s, r) => s + r.netKg, 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Inventory holdings with drill-down */}
            <p style={{ margin: '0 0 var(--space-2)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} /> Current Inventory Holdings
            </p>
            {filteredRmInv.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6)', fontSize: '0.9rem' }}>All stock consumed or no entries.</p>
            ) : (
              <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={thStyle}>Material Type</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Available (kg)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Rolls</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Sizes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRmInv.map(([name, v], i) => (
                      <>
                        <tr
                          key={name}
                          onClick={() => setExpandedRmRow(expandedRmRow === name ? null : name)}
                          style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'white' : 'var(--color-surface-muted)', cursor: 'pointer' }}
                        >
                          <td style={tdStyle}>
                            <strong>{name}</strong>
                            {v.variants.length > 1 && <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{expandedRmRow === name ? '▲' : '▼'} {v.variants.length} sizes</span>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{v.availableKg}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>{v.rolls}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>{v.variants.length}</td>
                        </tr>
                        {expandedRmRow === name && v.variants.map((variant, j) => (
                          <tr key={`${name}-${j}`} style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-primary-light, #fff8f5)' }}>
                            <td style={{ ...tdStyle, paddingLeft: '24px', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>↳ {variant.size}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontSize: '0.78rem' }}>{fmt(variant.availableKg)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{variant.rolls}</td>
                            <td />
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--color-surface-muted)', borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                      <td style={tdStyle}>Total ({filteredRmInv.length} types)</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-primary)' }}>{fmt(filteredRmInv.reduce((s, [, v]) => s + v.availableKg, 0))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{filteredRmInv.reduce((s, [, v]) => s + v.rolls, 0)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.75rem',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  verticalAlign: 'middle',
};
