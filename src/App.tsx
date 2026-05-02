import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { Login } from './pages/Login';
import { RawMaterials } from './pages/RawMaterials';
import { StockIn } from './pages/StockIn';
import { Bookings } from './pages/Bookings';
import { AdminSettings } from './pages/AdminSettings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Unauthenticated Routes */}
        <Route path="/login" element={<Login />} />

        {/* Authenticated App Routes (Wrapped in Layout) */}
        <Route path="/" element={<AppLayout />}>
          {/* Dashboard Route */}
          <Route index element={<Dashboard />} />
          
          {/* Other Routes */}
          <Route path="materials" element={<RawMaterials />} />
          <Route path="stock-in" element={<StockIn />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="clients" element={<PlaceholderPage title="Clients" />} />
          <Route path="wallet" element={<PlaceholderPage title="Wallet" />} />
          <Route path="profile" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
