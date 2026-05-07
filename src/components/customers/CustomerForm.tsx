import React from 'react';
import { Input } from '../../design-system/components/ui/Input';
import { Button } from '../../design-system/components/ui/Button';

interface CustomerFormProps {
  initialData?: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  submitLabel?: string;
  isCompact?: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel = 'Save Customer',
  isCompact = false
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 'var(--space-3)' : 'var(--space-4)' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Full Name</label>
        <Input defaultValue={initialData?.name} placeholder="Enter customer name" />
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Phone Number</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', padding: '0 12px', 
            background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--color-text-muted)'
          }}>+91</div>
          <Input defaultValue={initialData?.phone} placeholder="Phone number" style={{ flex: 1 }} maxLength={10} />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Email (Optional)</label>
        <Input defaultValue={initialData?.email} placeholder="email@example.com" />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Address</label>
        <Input defaultValue={initialData?.address} placeholder="Enter delivery address" />
      </div>
      
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: isCompact ? 'var(--space-2)' : 'var(--space-4)' }}>
        <Button variant="outline" style={{ flex: 1 }} onClick={onCancel}>Cancel</Button>
        <Button variant="primary" style={{ flex: 1 }} onClick={() => onSubmit({})}>{submitLabel}</Button>
      </div>
    </div>
  );
};
