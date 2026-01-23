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
import ManageParties from './pages/ManageParties';
import AddParty from './pages/AddParty';
import Input from './pages/Input';
import Output from './pages/Output';
import Challan from './pages/Challan';
import ManageCustomers from './pages/ManageCustomers';

import logo from './assets/logo.png';

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
            <div className="ml-10 flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Dashboard
              </Link>
              <Link
                to="/products"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/products')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Products
              </Link>
              <Link
                to="/input"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/input')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Production
              </Link>
              <Link
                to="/output"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/output')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Delivery
              </Link>
              <Link
                to="/challan"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/challan')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Challan
              </Link>
              <Link
                to="/manage-products"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/manage-products')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Transactions
              </Link>
              <Link
                to="/reports"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/reports')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Reports
              </Link>
              <Link
                to="/parties"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/parties')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Parties
              </Link>
              <Link
                to="/customers"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/customers')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
              >
                Customers
              </Link>

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
      {
        mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Dashboard
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/products')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Products
              </Link>
              <Link
                to="/input"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/input')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Production
              </Link>
              <Link
                to="/output"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/output')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Delivery
              </Link>
              <Link
                to="/challan"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/challan')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Challan
              </Link>
              <Link
                to="/manage-products"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/manage-products')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Transactions
              </Link>
              <Link
                to="/reports"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/reports')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Reports
              </Link>
              <Link
                to="/parties"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/parties')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Parties
              </Link>
              <Link
                to="/customers"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/customers')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Customers
              </Link>
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
        )
      }
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
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-product"
              element={
                <ProtectedRoute>
                  <AddProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-transaction"
              element={
                <ProtectedRoute>
                  <AddTransaction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-products"
              element={
                <ProtectedRoute>
                  <ManageProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parties"
              element={
                <ProtectedRoute>
                  <ManageParties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/input"
              element={
                <ProtectedRoute>
                  <Input />
                </ProtectedRoute>
              }
            />
            <Route
              path="/output"
              element={
                <ProtectedRoute>
                  <Output />
                </ProtectedRoute>
              }
            />
            <Route
              path="/challan"
              element={
                <ProtectedRoute>
                  <Challan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <ManageCustomers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-party"
              element={
                <ProtectedRoute>
                  <AddParty />
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
