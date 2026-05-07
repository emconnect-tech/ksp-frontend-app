import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { RawMaterials } from './pages/RawMaterials';
import { StockIn } from './pages/StockIn';
import { Bookings } from './pages/Bookings';
import { AdminSettings } from './pages/AdminSettings';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/auth/RouteGuards';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes (Redirect to dashboard if already logged in) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protected Routes (Wrapped in Layout and Auth Guard) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              
              {/* Other Routes */}
              <Route path="materials" element={<RawMaterials />} />
              <Route path="stock-in" element={<StockIn />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="customers" element={<Customers />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
