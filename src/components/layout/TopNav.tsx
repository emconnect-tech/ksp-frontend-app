import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type TopNavProps = {
  title: string;
};

export const TopNav = ({ title }: TopNavProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="top-nav">
      <div className="top-nav-content">
        <h1 className="page-title">{title}</h1>
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
