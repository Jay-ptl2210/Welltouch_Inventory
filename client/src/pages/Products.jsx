import React, { useState, useEffect } from 'react';
import { getProducts } from '../services/api';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    size: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredProducts = products.filter(product => {
    if (filters.name && product.name.toLowerCase().indexOf(filters.name.toLowerCase()) === -1) {
      return false;
    }
    if (filters.size && product.size.toLowerCase().indexOf(filters.size.toLowerCase()) === -1) {
      return false;
    }
    return true;
  });

  const uniqueProductNames = [...new Set(products.map(p => p.name))];
  const uniqueSizes = [...new Set(products.map(p => p.size))];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-3 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
          <div>
            <h2 className="text-xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">Products</h2>
            <p className="text-sm md:text-base text-gray-600">View and manage all products in your inventory</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 md:mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 overflow-hidden">
          <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
            <label htmlFor="filter-name" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Filter by Product Name
            </label>
            <input
              type="text"
              id="filter-name"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="Search by product name..."
              style={{ maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
            <label htmlFor="filter-size" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Filter by Size
            </label>
            <select
              id="filter-size"
              name="size"
              value={filters.size}
              onChange={handleFilterChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
              style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
            >
              <option value="">All Sizes</option>
              {uniqueSizes.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Table */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {products.length === 0 
                ? 'Get started by adding a new product.' 
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const stockStatus = product.quantity === 0 
                    ? 'out-of-stock' 
                    : product.quantity < 10 
                    ? 'low-stock' 
                    : 'in-stock';
                  
                  return (
                    <tr key={product._id || product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{product.size}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {product.quantity.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {product.previousStock ? product.previousStock.toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            stockStatus === 'out-of-stock'
                              ? 'bg-red-100 text-red-800'
                              : stockStatus === 'low-stock'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {stockStatus === 'out-of-stock'
                            ? 'Out of Stock'
                            : stockStatus === 'low-stock'
                            ? 'Low Stock'
                            : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {filteredProducts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Total Products</div>
                <div className="text-2xl font-bold text-blue-900">{filteredProducts.length}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">In Stock</div>
                <div className="text-2xl font-bold text-green-900">
                  {filteredProducts.filter(p => p.quantity > 0).length}
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-red-600 font-medium">Out of Stock</div>
                <div className="text-2xl font-bold text-red-900">
                  {filteredProducts.filter(p => p.quantity === 0).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Products;

