import React from 'react';
import { Input } from '../../design-system/components/ui/Input';
import { Button } from '../../design-system/components/ui/Button';

interface CustomerFormProps {
  initialData?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
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
  const [name, setName] = React.useState(initialData?.name || '');
  const [phone, setPhone] = React.useState(initialData?.phone || '');
  const [email, setEmail] = React.useState(initialData?.email || '');
  const [address, setAddress] = React.useState(initialData?.address || '');

  const handleSubmit = () => {
    onSubmit({ name, phoneNumber: phone, email, place: address, transportName: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 'var(--space-3)' : 'var(--space-4)' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Full Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name" />
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Phone Number</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', padding: '0 12px', 
            background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--color-text-muted)'
          }}>+91</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" style={{ flex: 1 }} maxLength={10} />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Email / Transport Name (Optional)</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Transport Name or Email" />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Place / Address</label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter place / address" />
      </div>
      
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: isCompact ? 'var(--space-2)' : 'var(--space-4)' }}>
        <Button variant="outline" style={{ flex: 1 }} onClick={onCancel}>Cancel</Button>
        <Button variant="primary" style={{ flex: 1 }} onClick={handleSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
};
