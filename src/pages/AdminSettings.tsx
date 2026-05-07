import { useState } from 'react';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { Button } from '../design-system/components/ui/Button';
import { SegmentedControl } from '../design-system/components/ui/SegmentedControl';
import { Badge } from '../design-system/components/ui/Badge';

export const AdminSettings = () => {
  const [tab, setTab] = useState('catalog');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingVariantToId, setAddingVariantToId] = useState<number | null>(null);

  // Mock State for Products to show enable/disable functionality
  const [products, setProducts] = useState([
    { id: 1, name: 'Green Net (Planet Agro)', active: true, gsmMin: 105, gsmMax: 115, variants: [{ size: '110 GSM • 30x60', price: 2500 }, { size: '90 GSM • 40x40', price: 3200 }] },
    { id: 2, name: 'Tarpaulin', active: true, gsmMin: 115, gsmMax: 125, variants: [{ size: '120 GSM • 50x50', price: 4500 }] },
    { id: 3, name: 'Mulch Film', active: false, gsmMin: 23, gsmMax: 27, variants: [{ size: '25 Micron • 400m', price: 1800 }] },
  ]);

  const toggleProductStatus = (id: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div className="page-content">
      <h2 style={{ marginTop: 0, marginBottom: 'var(--space-6)', fontSize: '1.25rem' }}>
        Superadmin Panel
      </h2>

      <SegmentedControl
        options={[
          { label: 'Catalog & Prices', value: 'catalog' },
          { label: 'System Masters', value: 'masters' }
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 'var(--space-6)' }}>
        {tab === 'catalog' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {!showAddProduct ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Products & Variants</h3>
                <Button variant="primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddProduct(true)}>
                  + Add Product
                </Button>
              </div>
            ) : (
              <Card style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-primary)' }}>
                <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>New Product</h3>
                <Input type="text" placeholder="Product Name (e.g. Shade Net)" style={{ marginBottom: 'var(--space-3)' }} />

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>GSM Tolerance (± Range)</label>
                  <div className="grid-layout">
                    <Input type="number" placeholder="Min GSM (e.g. 105)" />
                    <Input type="number" placeholder="Max GSM (e.g. 115)" />
                  </div>
                </div>

                <div className="grid-layout" style={{ marginBottom: 'var(--space-4)' }}>
                  <Input type="text" placeholder="Default Variant (e.g. 30x60)" />
                  <Input type="number" placeholder="Base Price (₹)" />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Cancel</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => setShowAddProduct(false)}>Save Product</Button>
                </div>
              </Card>
            )}

            {products.map((product) => (
              <Card key={product.id} style={{ padding: 'var(--space-4)', opacity: product.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{product.name}</strong>
                      {!product.active && <Badge status="completed">Disabled</Badge>}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      GSM Tolerance: {product.gsmMin} - {product.gsmMax} GSM
                    </span>
                  </div>

                  {/* Enable / Disable Toggle Button */}
                  <Button
                    variant={product.active ? "outline" : "primary"}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                    onClick={() => toggleProductStatus(product.id)}
                  >
                    {product.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>

                {product.variants.map((variant, idx) => (
                  <div key={idx} style={{ background: 'var(--color-surface-muted)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>{variant.size}</span>
                    <Input type="number" defaultValue={variant.price} style={{ width: '100px', padding: '4px 8px' }} disabled={!product.active} />
                  </div>
                ))}

                {addingVariantToId === product.id ? (
                  <div style={{ background: 'var(--color-primary-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginTop: 'var(--space-2)' }}>
                    <div className="grid-layout" style={{ marginBottom: 'var(--space-2)' }}>
                      <Input type="text" placeholder="Size/GSM (e.g. 100 GSM • 20x20)" style={{ background: 'white' }} />
                      <Input type="number" placeholder="Price (₹)" style={{ background: 'white' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button variant="outline" style={{ flex: 1, padding: '4px', fontSize: '0.8rem' }} onClick={() => setAddingVariantToId(null)}>Cancel</Button>
                      <Button variant="primary" style={{ flex: 1, padding: '4px', fontSize: '0.8rem' }} onClick={() => setAddingVariantToId(null)}>Add</Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    style={{ width: '100%', marginTop: 'var(--space-2)', borderStyle: 'dashed', fontSize: '0.8rem', padding: 'var(--space-1)' }}
                    onClick={() => setAddingVariantToId(product.id)}
                    disabled={!product.active}
                  >
                    + Add Variant (Price Record)
                  </Button>
                )}
              </Card>
            ))}

            <Button variant="primary" style={{ marginTop: 'var(--space-4)' }}>Save Price Changes</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>Manage Statuses</h3>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <Input type="text" placeholder="New Order Status..." />
                <Button variant="primary">Add</Button>
              </div>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', color: 'var(--color-text-muted)' }}>
                <li>Quotation Generated</li>
                <li>Bill Uploaded</li>
                <li>Dispatched</li>
                <li>LR Uploaded</li>
                <li>Completed</li>
                <li>Cancelled</li>
              </ul>
            </Card>

            <Card>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>Manage Units of Measure</h3>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', color: 'var(--color-text-muted)' }}>
                <li>Bundles (BND)</li>
                <li>Kilograms (KG)</li>
                <li>Rolls (RLL)</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
