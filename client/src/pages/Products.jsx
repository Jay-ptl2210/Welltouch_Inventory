import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, updateProduct, deleteProduct } from '../services/api';

function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    size: '',
    type: 'ST',
    packetsPerLinear: '',
    pcsPerPacket: '',
    quantity: '',
    quantityUnit: 'pcs'
  });
  const [filters, setFilters] = useState({
    name: '',
    size: '',
    type: ''
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
      setMessage({ type: '', text: '' });
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product._id || product.id);
    setEditForm({
      name: product.name,
      size: product.size,
      type: product.type || 'ST',
      packetsPerLinear: (product.packetsPerLinear ?? '').toString(),
      pcsPerPacket: (product.pcsPerPacket ?? '').toString(),
      quantity: product.quantity.toString(),
      quantityUnit: 'pcs'
    });
    setMessage({ type: '', text: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      size: '',
      type: 'ST',
      packetsPerLinear: '',
      pcsPerPacket: '',
      quantity: '',
      quantityUnit: 'pcs'
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (id) => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const payload = {
        name: editForm.name,
        size: editForm.size,
        type: editForm.type,
        packetsPerLinear: parseFloat(editForm.packetsPerLinear) || 0,
        pcsPerPacket: parseFloat(editForm.pcsPerPacket) || 0,
        quantity: parseFloat(editForm.quantity) || 0,
        quantityUnit: editForm.quantityUnit
      };

      await updateProduct(id, payload);
      setMessage({ type: 'success', text: 'Product updated successfully' });
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update product'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await deleteProduct(id);
      setMessage({ type: 'success', text: 'Product deleted successfully' });
      await loadProducts();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to delete product'
      });
    } finally {
      setSaving(false);
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
    if (filters.type && product.type !== filters.type) {
      return false;
    }
    return true;
  });

  const uniqueProductNames = [...new Set(products.map(p => p.name))];
  const uniqueSizes = [...new Set(products.map(p => p.size))];

  const toCounts = (product) => {
    const packetsPerLinear = Number(product.packetsPerLinear) || 0;
    const pcsPerPacket = Number(product.pcsPerPacket) || 0;
    const pcs = Number(product.quantity) || 0;
    const packets = pcsPerPacket > 0 ? pcs / pcsPerPacket : 0;
    const linears = packetsPerLinear > 0 && pcsPerPacket > 0 ? pcs / (packetsPerLinear * pcsPerPacket) : 0;
    return { pcs, packets, linears };
  };

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
          <div className="mt-3 md:mt-0">
            <button
              type="button"
              onClick={() => navigate('/add-product')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Add Product
            </button>
          </div>
        </div>

        {message.text && (
          <div
            className={`mb-3 md:mb-4 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base rounded ${message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 md:mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 overflow-hidden">
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

          <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
            <label htmlFor="filter-type" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Filter by Type
            </label>
            <select
              id="filter-type"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
              style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
            >
              <option value="">All Types</option>
              <option value="ST">Stat (ST)</option>
              <option value="TF">Tri Fold (TF)</option>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock (Linear / Packets / Pcs)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Packets per Linear
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pcs per Packet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const counts = toCounts(product);
                  const stockStatus = counts.pcs === 0
                    ? 'out-of-stock'
                    : counts.pcs < 10
                      ? 'low-stock'
                      : 'in-stock';

                  const isEditing = editingId === (product._id || product.id);

                  return (
                    <tr key={product._id || product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            name="size"
                            value={editForm.size}
                            onChange={handleEditChange}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{product.size}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            name="type"
                            value={editForm.type}
                            onChange={handleEditChange}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            <option value="ST">ST</option>
                            <option value="TF">TF</option>
                          </select>
                        ) : (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.type === 'ST' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                            {product.type === 'ST' ? 'Stat' : 'Tri Fold'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <select
                              name="quantityUnit"
                              value={editForm.quantityUnit}
                              onChange={handleEditChange}
                              className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
                            >
                              <option value="linear">Linear</option>
                              <option value="packet">Packets</option>
                              <option value="pcs">Pieces</option>
                            </select>
                            <input
                              type="number"
                              name="quantity"
                              step="0.01"
                              min="0"
                              value={editForm.quantity}
                              onChange={handleEditChange}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-gray-900">
                            {`${counts.linears.toFixed(2)} / ${counts.packets.toFixed(2)} / ${counts.pcs.toFixed(2)}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            name="packetsPerLinear"
                            step="0.01"
                            min="0"
                            value={editForm.packetsPerLinear}
                            onChange={handleEditChange}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">
                            {product.packetsPerLinear}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            name="pcsPerPacket"
                            step="1"
                            min="0"
                            value={editForm.pcsPerPacket}
                            onChange={handleEditChange}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">
                            {product.pcsPerPacket}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stockStatus === 'out-of-stock'
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSave(product._id || product.id)}
                              disabled={saving}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(product)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(product._id || product.id)}
                              disabled={saving}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
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

