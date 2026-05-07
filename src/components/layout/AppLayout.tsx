import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopNav } from './TopNav';

export const AppLayout = () => {
  const location = useLocation();
  
  // A simple way to get a title based on the route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/bookings': return 'Orders & Bookings';
      case '/customers': return 'Customers';
      case '/wallet': return 'Wallet & Payments';
      case '/profile': return 'My Profile';
      default: return 'KSP Platform';
    }
  };

  return (
    <div className="app-container">
      <TopNav title={getPageTitle()} />
      
      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};
