import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/components/ui/Button';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';

export const Login = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setStep('otp');
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      // Mock successful login, redirect to dashboard
      navigate('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
      background: 'linear-gradient(135deg, var(--color-background) 0%, #fff0e6 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            background: 'var(--color-primary)', 
            borderRadius: 'var(--radius-pill)',
            margin: '0 auto var(--space-4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '2rem', fontWeight: 'bold',
            boxShadow: 'var(--shadow-float)'
          }}>
            K
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)' }}>Welcome to KSP</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Inventory & Order Management
          </p>
        </div>

        <Card style={{ padding: 'var(--space-6)', border: 'none', boxShadow: 'var(--shadow-float)' }}>
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: 'var(--space-6)' }}>Sign In</h2>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                  Phone Number
                </label>
                <Input 
                  type="tel" 
                  placeholder="Enter your phone number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
              </div>
              <Button variant="primary" style={{ width: '100%', padding: 'var(--space-4)' }}>
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: 'var(--space-2)' }}>Verify OTP</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                Code sent to {phone} <button type="button" onClick={() => setStep('phone')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Edit</button>
              </p>
              
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <Input 
                  type="text" 
                  placeholder="Enter 6-digit code" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.25em' }}
                  autoFocus
                />
              </div>
              <Button variant="primary" style={{ width: '100%', padding: 'var(--space-4)' }}>
                Verify & Login
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
