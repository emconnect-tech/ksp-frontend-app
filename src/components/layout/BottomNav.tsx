import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, Users, BarChart3, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const BottomNav = () => {
  const { user } = useAuth();

  const navItems = [
    { to: '/', icon: <Home size={22} />, label: 'Home', module: 'Home' },
    { to: '/bookings', icon: <CalendarDays size={22} />, label: 'Orders', module: 'Bookings' },
    { to: '/reports', icon: <BarChart3 size={22} />, label: 'Reports', module: 'Reports' },
    { to: '/customers', icon: <Users size={22} />, label: 'Customers', module: 'Bookings' }, // Customers usually tied to Bookings/Sales
    { to: '/profile', icon: <User size={22} />, label: 'Admin', module: 'Admin' },
  ];

  const filteredItems = navItems.filter(item => 
    item.module === 'Home' || (user?.modules.includes(item.module))
  );

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {filteredItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
