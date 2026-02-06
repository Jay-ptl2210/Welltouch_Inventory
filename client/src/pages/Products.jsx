import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, updateProduct, deleteProduct, getParties } from '../services/api';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

function Products() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    size: '',
    type: 'PPF TF',
    packetsPerLinear: '',
    pcsPerPacket: '',
    quantity: '',
    quantityUnit: 'pcs',
    party: '',
    weight: '0'
  });
  const [filters, setFilters] = useState({
    name: '',
    size: '',
    type: '',
    weight: '',
    party: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    loadProducts();
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const response = await getParties();
      setParties(response.data);
    } catch (err) {
      console.error('Failed to load parties', err);
    }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All related transactions will also be deleted.')) {
      return;
    }

    try {
      setSaving(true);
      await deleteProduct(id);
      setMessage({ type: 'success', text: 'Product deleted successfully!' });
      loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete product' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product._id || product.id);
    setEditForm({
      name: product.name,
      size: product.size,
      type: product.type || 'PPF TF',
      packetsPerLinear: product.packetsPerLinear,
      pcsPerPacket: product.pcsPerPacket,
      quantity: product.quantity,
      quantityUnit: product.quantityUnit || 'pcs',
      party: product.party?._id || product.party || '',
      weight: product.weight || '0'
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      size: '',
      type: 'PPF TF',
      packetsPerLinear: '',
      pcsPerPacket: '',
      quantity: '',
      quantityUnit: 'pcs',
      party: '',
      weight: '0'
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
      await updateProduct(id, editForm);
      setMessage({ type: 'success', text: 'Product updated successfully!' });
      setEditingId(null);
      loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update product' });
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
    setCurrentPage(1);
  };

  const filteredProducts = products.filter(product => {
    if (filters.name && !product.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    if (filters.size && product.size !== filters.size) {
      return false;
    }
    if (filters.type && product.type !== filters.type) {
      return false;
    }
    if (filters.weight && String(product.weight) !== filters.weight) {
      return false;
    }
    if (filters.party && (product.party?._id || product.party) !== filters.party) {
      return false;
    }
    return true;
  });

  const totalItems = filteredProducts.length;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const uniqueSizes = [...new Set(products.map(p => p.size))].filter(Boolean).sort();
  const uniqueTypes = [...new Set(products.map(p => p.type))].filter(Boolean).sort();
  const uniqueWeights = [...new Set(products.map(p => p.weight))].filter(w => w !== undefined).sort((a, b) => a - b);

  const toCounts = (product) => {
    const packetsPerLinear = Number(product.packetsPerLinear) || 0;
    const pcsPerPacket = Number(product.pcsPerPacket) || 0;
    const pcs = Number(product.quantity) || 0;
    const packets = pcsPerPacket > 0 ? pcs / pcsPerPacket : 0;
    const linears = packetsPerLinear > 0 && pcsPerPacket > 0 ? pcs / (packetsPerLinear * pcsPerPacket) : 0;
    return { pcs, packets, linears };
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-3">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        <span className="text-sm font-bold uppercase tracking-wider">{error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">View and manage all products in your inventory</p>
        </div>
        {(user?.role === 'super_user' || user?.permissions?.products === 'edit') && (
          <button
            onClick={() => navigate('/add-product')}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            Add New Product
          </button>
        )}
      </div>

      {/* Control Panel (Filters) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Party</label>
            <select
              name="party"
              value={filters.party}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Parties</option>
              {parties.slice().sort((a, b) => a.name.localeCompare(b.name)).map(party => (
                <option key={party._id} value={party._id}>{party.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Name</label>
            <select
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Products</option>
              {[...new Set(products.map(p => p.name))].sort((a, b) => a.localeCompare(b)).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Size</label>
            <select
              name="size"
              value={filters.size}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Sizes</option>
              {uniqueSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Weight</label>
            <select
              name="weight"
              value={filters.weight}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Weights</option>
              {uniqueWeights.map(w => (
                <option key={w} value={w}>{w}gm</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Indicators Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Total Products</p>
          <p className="text-3xl font-bold text-gray-900">{filteredProducts.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">In Stock</p>
          <p className="text-3xl font-bold text-gray-900 text-green-600">{filteredProducts.filter(p => p.quantity > 0).length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Out of Stock</p>
          <p className="text-3xl font-bold text-gray-900 text-red-600">{filteredProducts.filter(p => p.quantity === 0).length}</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Products Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg">No products found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Size & Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Weight (gm)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Party</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Current Stock</th>
                    {(user?.role === 'super_user' || user?.permissions?.products === 'edit') && (
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => {
                    const counts = toCounts(product);
                    const isEditing = editingId === (product._id || product.id);

                    return (
                      <tr key={product._id || product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              name="name"
                              value={editForm.name}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                name="size"
                                value={editForm.size}
                                onChange={handleEditChange}
                                placeholder="Size"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm mb-2"
                              />
                              <input
                                type="text"
                                name="type"
                                value={editForm.type}
                                onChange={handleEditChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-xs"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700">{product.size}</span>
                              <span className="text-xs text-primary-600 font-medium">{product.type}</span>
                            </div>
                          )
                          }
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              name="weight"
                              step="0.01"
                              value={editForm.weight}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                            />
                          ) : (
                            <span className="text-sm text-gray-500">{product.weight || 0} gm</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              name="party"
                              value={editForm.party}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-xs"
                            >
                              <option value="">No Party</option>
                              {parties.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-sm text-gray-500">{product.party?.name || 'N/A'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  name="quantity"
                                  step="0.01"
                                  value={editForm.quantity}
                                  onChange={handleEditChange}
                                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                                />
                                <select
                                  name="quantityUnit"
                                  value={editForm.quantityUnit}
                                  onChange={handleEditChange}
                                  className="px-2 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-xs"
                                >
                                  <option value="linear">Linear</option>
                                  <option value="packet">Packets</option>
                                  <option value="pcs">Pieces</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-1 gap-2 mx-auto max-w-[120px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">P/L:</span>
                                  <input type="number" name="packetsPerLinear" step="0.01" value={editForm.packetsPerLinear} onChange={handleEditChange} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded" />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">C/P:</span>
                                  <input type="number" name="pcsPerPacket" step="1" value={editForm.pcsPerPacket} onChange={handleEditChange} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className={`text-sm font-bold ${product.quantity > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                {`${counts.linears.toFixed(1)}L / ${counts.packets.toFixed(0)}P / ${counts.pcs.toFixed(0)}Pcs`}
                              </span>
                              <span className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full ${product.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </div>
                          )}
                        </td>
                        {(user?.role === 'super_user' || user?.permissions?.products === 'edit') && (
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleSave(product._id || product.id)} className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg transition-colors" title="Save">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button onClick={cancelEdit} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition-colors" title="Cancel">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => startEdit(product)} className="text-gray-400 hover:text-primary-600 p-2 rounded-lg hover:bg-primary-50 transition-all border border-transparent hover:border-primary-100">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(product._id || product.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all border border-transparent hover:border-red-100">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Products;
