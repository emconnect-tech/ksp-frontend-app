import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, Users, Wallet, User } from 'lucide-react';

export const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={24} />
          <span>Home</span>
        </NavLink>
        
        <NavLink to="/bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarDays size={24} />
          <span>Bookings</span>
        </NavLink>
        
        <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={24} />
          <span>Customers</span>
        </NavLink>
        
        <NavLink to="/wallet" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Wallet size={24} />
          <span>Wallet</span>
        </NavLink>
        
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={24} />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
