import { Card } from '../design-system/components/ui/Card';
import { Button } from '../design-system/components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const Suspended = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.status === 'ACTIVE') {
      navigate('/', { replace: true });
    } else if (user?.status === 'PENDING') {
      navigate('/pending-approval', { replace: true });
    }
  }, [user?.status, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
      background: 'linear-gradient(135deg, var(--color-background) 0%, #ffe3e3 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            background: 'var(--color-error)', 
            borderRadius: '50%',
            margin: '0 auto var(--space-4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '2rem'
          }}>
            🚫
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)', color: 'var(--color-error)' }}>Account Suspended</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Your account has been temporarily disabled by the administrator. 
            Please contact support or your manager for further assistance.
          </p>
        </div>

        <Card style={{ padding: 'var(--space-6)', border: 'none', boxShadow: 'var(--shadow-float)' }}>
          <Button variant="outline" onClick={handleLogout} style={{ width: '100%' }}>
            Log Out
          </Button>
        </Card>
      </div>
    </div>
  );
};
