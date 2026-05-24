import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useNavigate } from 'react-router-dom';

type TopNavProps = {
  title: string;
};

export const TopNav = ({ title }: TopNavProps) => {
  const { logout } = useAuth();
  const { preferences } = useOrg();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="top-nav">
      <div className="top-nav-content">
        <div>
          {preferences.displayName && (
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {preferences.displayName}
            </p>
          )}
          <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
        </div>
        <div className="top-nav-actions">
          <button className="icon-btn">
            <Search size={22} />
          </button>
          <button className="icon-btn">
            <Bell size={22} />
          </button>
          <button className="icon-btn" onClick={handleLogout} title="Logout">
            <LogOut size={22} />
          </button>
          <div className="avatar">A</div>
        </div>
      </div>
    </header>
  );
};
