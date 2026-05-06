import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/components/ui/Button';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { config } from '../config';

export const Login = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setLoading(true);

      if (config.USE_MOCK_API) {
        setTimeout(() => {
          setSessionId('mock-session-id-1234');
          setStep('otp');
          setLoading(false);
        }, 800);
        return;
      }

      try {
        const response = await fetch('/api/v1/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone })
        });
        if (response.ok) {
          const data = await response.json();
          setSessionId(data.sessionId);
          setStep('otp');
        } else {
          alert('Failed to send OTP');
        }
      } catch (err) {
        alert('Error connecting to server');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length > 0 && sessionId) {
      setLoading(true);

      if (config.USE_MOCK_API) {
        setTimeout(() => {
          if (otp === '1234') {
            localStorage.setItem('ksp_token', 'mock_jwt_token_for_development');
            navigate('/');
          } else {
            alert('Invalid Mock OTP. Use 1234.');
            setLoading(false);
          }
        }, 800);
        return;
      }

      try {
        const response = await fetch('/api/v1/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, otp })
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('ksp_token', data.accessToken);
          navigate('/');
        } else {
          alert('Invalid OTP');
        }
      } catch (err) {
        alert('Error connecting to server');
      } finally {
        setLoading(false);
      }
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
                  disabled={loading}
                />
              </div>
              <Button variant="primary" style={{ width: '100%', padding: 'var(--space-4)' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
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
                  placeholder="Enter 4-digit code (Hint: 1234)" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.25em' }}
                  autoFocus
                  disabled={loading}
                />
              </div>
              <Button variant="primary" style={{ width: '100%', padding: 'var(--space-4)' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
