import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AddProduct from './pages/AddProduct';
import ManageProducts from './pages/ManageProducts';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/Register';
import AddTransaction from './pages/AddTransaction';
import Reports from './pages/Reports';
import ManageEntities from './pages/ManageEntities';
import Input from './pages/Input';
import Output from './pages/Output';
import Challan from './pages/Challan';
import DeliveryReport from './pages/DeliveryReport';
import ManageTransports from './pages/ManageTransports';
import UserManagement from './pages/UserManagement';

import logo from './assets/logo.png';

const NavLink = ({ to, children, active, mobile, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`${mobile
      ? `block px-3 py-2 rounded-md text-base font-medium ${active ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-primary-100'}`
      : `px-3 py-2 rounded-md text-sm font-medium ${active ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'}`
      }`}
  >
    {children}
  </Link>
);

const NavDropdown = ({ label, items, user, activePath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleItems = items.filter(item =>
    !item.permission || user?.role === 'super_user' || user?.permissions?.[item.permission] !== 'none'
  );

  if (visibleItems.length === 0) return null;

  const isAnyActive = visibleItems.some(item => activePath === item.path);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-all ${isAnyActive
          ? 'bg-primary-600 text-white'
          : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
          }`}
      >
        {label}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
          {visibleItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm ${activePath === item.path
                ? 'bg-primary-50 text-primary-600 font-bold'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const MobileNavDropdown = ({ label, items, user, activePath, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const visibleItems = items.filter(item =>
    !item.permission || user?.role === 'super_user' || user?.permissions?.[item.permission] !== 'none'
  );

  if (visibleItems.length === 0) return null;

  const isAnyActive = visibleItems.some(item => activePath === item.path);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors ${isAnyActive
          ? 'bg-primary-50 text-primary-600'
          : 'text-gray-700 hover:bg-gray-100'
          }`}
      >
        <span>{label}</span>
        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-1">
          {visibleItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              onClick={onSelect}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${activePath === item.path
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setUserMenuOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  if (!isAuthenticated) {
    return null;
  }

  const dashboardItems = [
    { label: 'Dashboard', path: '/', permission: 'dashboard' },
    { label: 'Transactions', path: '/manage-products', permission: 'transactions' },
    { label: 'Report', path: '/reports', permission: 'reports' },
    { label: 'Delivery Report', path: '/delivery-report', permission: 'deliveryReport' }
  ];

  const manufacturingItems = [
    { label: 'Production', path: '/input', permission: 'production' },
    { label: 'Challan', path: '/challan', permission: 'challan' },
    { label: 'Delivery', path: '/output', permission: 'delivery' }
  ];

  const contactItems = [
    { label: 'Party & Customer', path: '/entities', permission: 'entities' },
    { label: 'Transport', path: '/transports', permission: 'transports' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Welltouch" className="h-10 w-auto" />
              <span className="ml-2 text-primary-600 font-bold text-xl">Welltouch</span>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-2">
              <NavDropdown label="Dashboard" items={dashboardItems} user={user} activePath={location.pathname} />

              {(user?.role === 'super_user' || user?.permissions?.products !== 'none') && (
                <NavLink to="/products" active={isActive('/products')}>Inventory</NavLink>
              )}

              <NavDropdown label="Manufacturing" items={manufacturingItems} user={user} activePath={location.pathname} />

              <NavDropdown label="Contacts" items={contactItems} user={user} activePath={location.pathname} />

              {user?.role === 'super_user' && (
                <NavLink to="/users" active={isActive('/users')}>User</NavLink>
              )}

              <div className="relative ml-3" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-primary-600 focus:outline-none transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span>{user?.name || 'User'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-4 py-2 text-xs text-gray-500 border-b">
                      Logged in as<br />
                      <span className="font-semibold text-gray-700">{user?.email}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="md:hidden">
            <button
              type="button"
              className="bg-slate-800 inline-flex items-center justify-center p-2 rounded text-slate-300 hover:text-white focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t max-h-[80vh] overflow-y-auto">
            <MobileNavDropdown
              label="Dashboard"
              items={dashboardItems}
              user={user}
              activePath={location.pathname}
              onSelect={() => setMobileMenuOpen(false)}
            />

            {(user?.role === 'super_user' || user?.permissions?.products !== 'none') && (
              <NavLink to="/products" mobile active={isActive('/products')} onClick={() => setMobileMenuOpen(false)}>Inventory</NavLink>
            )}

            <MobileNavDropdown
              label="Manufacturing"
              items={manufacturingItems}
              user={user}
              activePath={location.pathname}
              onSelect={() => setMobileMenuOpen(false)}
            />

            <MobileNavDropdown
              label="Contacts"
              items={contactItems}
              user={user}
              activePath={location.pathname}
              onSelect={() => setMobileMenuOpen(false)}
            />

            {user?.role === 'super_user' && (
              <NavLink to="/users" mobile active={isActive('/users')} onClick={() => setMobileMenuOpen(false)}>User Management</NavLink>
            )}

            <div className="px-3 py-2 text-sm text-gray-500 border-t mt-2 pt-2">
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav >
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="w-full mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-4 overflow-x-hidden flex-grow">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute module="dashboard">
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-product"
              element={
                <ProtectedRoute module="products" level="edit">
                  <AddProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-transaction"
              element={
                <ProtectedRoute module="transactions" level="edit">
                  <AddTransaction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute module="products">
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-products"
              element={
                <ProtectedRoute module="transactions">
                  <ManageProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute module="reports">
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/entities"
              element={
                <ProtectedRoute module="entities">
                  <ManageEntities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/input"
              element={
                <ProtectedRoute module="production">
                  <Input />
                </ProtectedRoute>
              }
            />
            <Route
              path="/output"
              element={
                <ProtectedRoute module="delivery">
                  <Output />
                </ProtectedRoute>
              }
            />
            <Route
              path="/challan"
              element={
                <ProtectedRoute module="challan">
                  <Challan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery-report"
              element={
                <ProtectedRoute module="deliveryReport">
                  <DeliveryReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transports"
              element={
                <ProtectedRoute module="transports">
                  <ManageTransports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        {/* Footer */}
        {isAuthenticated && (
          <footer className="bg-white border-t border-gray-200 mt-auto py-6">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} Welltouch Inventory. All rights reserved.
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">v1.1.0</span>
                <a
                  href="https://jayptlportfolio.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Jay Patel
                </a>
              </div>
            </div>
          </footer>
        )}
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
