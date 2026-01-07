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
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-primary-700">Welltouch Inventory</h1>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Dashboard
              </Link>
              <Link
                to="/products"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/products')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Products
              </Link>
              <Link
                to="/manage-products"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/manage-products')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Transactions
              </Link>
              <Link
                to="/reports"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/reports')
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
              >
                Reports
              </Link>
              <div className="relative ml-4" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-primary-100 hover:text-primary-700 focus:outline-none"
                >
                  <span className="max-w-[120px] truncate">{user?.name || 'User'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 max-h-64 overflow-y-auto">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b break-words">
                      {user?.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
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
              className="bg-primary-600 inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-primary-700 focus:outline-none"
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
    </nav>
  );
}

function AppContent() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 overflow-x-hidden">
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
          </Routes>
        </main>
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
