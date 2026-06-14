import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/components/ui/Button';
import { Card } from '../design-system/components/ui/Card';
import { Input } from '../design-system/components/ui/Input';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';

export const Login = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useOrg();

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    if (value.length <= 10) {
      setPhone(value);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    if (value.length <= 4) {
      setOtp(value);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10) {
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
        const fullPhoneNumber = `+91${phone}`;
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: fullPhoneNumber })
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
    if (otp.length === 4 && sessionId) {
      setLoading(true);

      if (config.USE_MOCK_API) {
        setTimeout(async () => {
          if (otp === '1234') {
            // A valid JWT format with dummy payload to pass `atob` parsing in AuthContext
            const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrLXVzZXIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJzdGF0dXMiOiJBQ1RJVkUiLCJwaG9uZSI6Iis5MTk5OTk5OTk5OTkiLCJvcmdJZCI6Im9yZy0xIn0=.signature';
            await login(mockJwt);
            navigate('/', { replace: true });
          } else {
            alert('Invalid Mock OTP. Use 1234.');
            setLoading(false);
          }
        }, 800);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, otp })
        });
        if (response.ok) {
          const data = await response.json();
          await login(data.accessToken);
          navigate('/', { replace: true });
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

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: `+91${phone}` })
      });
      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        setOtp('');
        startCooldown();
      } else {
        alert('Failed to resend OTP');
      }
    } catch {
      alert('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (step === 'otp') startCooldown(); }, [step]);
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

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
            {theme.displayName ? theme.displayName[0].toUpperCase() : '?'}
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)' }}>
            {theme.displayName ? `Welcome to ${theme.displayName}` : 'Welcome'}
          </h1>
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
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: 'var(--color-surface-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 var(--space-3)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--color-text-muted)',
                    whiteSpace: 'nowrap'
                  }}>
                    🇮🇳 +91
                  </div>
                  <Input 
                    type="tel" 
                    placeholder="Enter phone number" 
                    value={phone}
                    onChange={handlePhoneChange}
                    autoFocus
                    disabled={loading}
                    maxLength={10}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <Button variant="primary" style={{ width: '100%', padding: 'var(--space-4)' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: 'var(--space-2)' }}>Verify OTP</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                Code sent to +91 {phone} <button type="button" onClick={() => setStep('phone')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Edit</button>
              </p>
              
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <Input 
                  type="text" 
                  placeholder="Enter 4-digit code" 
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={4}
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.4em' }}
                  autoFocus
                  disabled={loading}
                />
              </div>
              <Button variant="primary" style={{ width: '100%', padding: 'var(--space-4)' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', padding: 0, fontWeight: 600, color: resendCooldown > 0 ? 'var(--color-text-muted)' : 'var(--color-primary)' }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
