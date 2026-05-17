import { Card } from '../design-system/components/ui/Card';
import { Button } from '../design-system/components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const PendingApproval = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.status === 'ACTIVE') {
      navigate('/', { replace: true });
    } else if (user?.status === 'SUSPENDED') {
      navigate('/suspended', { replace: true });
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
      background: 'linear-gradient(135deg, var(--color-background) 0%, #fff0e6 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            background: 'var(--color-warning)', 
            borderRadius: '50%',
            margin: '0 auto var(--space-4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '2rem'
          }}>
            ⏳
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)' }}>Account Pending</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Your account has been created but is currently awaiting administrator approval. 
            You will be able to access the dashboard once approved.
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
