import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, addTransaction, getTransactions, deleteTransaction, getParties } from '../services/api';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { toPcs, fromPcs } from '../utils/calculations';

function ManageProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    partyId: '',
    productId: '',
    type: 'delivered',
    quantity: '',
    unit: 'linear',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [filters, setFilters] = useState({
    name: '',
    size: '',
    type: '', // Transaction type (produce/delivered)
    productType: '', // Product type (PPF TF, etc.)
    party: '',
    weight: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingTransaction, setEditingTransaction] = useState(null);

  const isEditable = user?.role === 'super_user' || user?.permissions?.transactions === 'edit';


  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productsRes, transactionsRes, partiesRes] = await Promise.all([
        getProducts(),
        getTransactions(),
        getParties()
      ]);
      console.log('Loaded products:', productsRes.data.length);
      console.log('Loaded transactions:', transactionsRes.data.length);
      if (transactionsRes.data.length > 0) {
        console.log('Sample transaction:', transactionsRes.data[0]);
      }
      setProducts(productsRes.data);
      setTransactions(transactionsRes.data);
      setParties(partiesRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setMessage({ type: 'error', text: 'Failed to synchronize ledger data' });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = { ...prev, [name]: value };
      if (name === 'partyId') {
        newState.productId = ''; // Reset product when party changes
      }
      return newState;
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const selectedProduct = products.find(p => p._id === formData.productId);
      if (!selectedProduct) throw new Error('Product not found');

      // Note: toPcs expects (quantity, unit, productLike)
      const pcs = toPcs(formData.quantity, formData.unit, selectedProduct);

      if (editingTransaction) {
        await updateTransaction(editingTransaction._id, {
          productId: formData.productId,
          productName: selectedProduct.name,
          size: selectedProduct.size,
          type: formData.type,
          quantity: formData.quantity,
          unit: formData.unit,
          date: formData.date,
          note: formData.note
        });
        setMessage({ type: 'success', text: 'Transaction updated successfully' });
      } else {
        await addTransaction({
          productId: selectedProduct._id,
          productName: selectedProduct.name,
          size: selectedProduct.size,
          type: formData.type,
          quantity: formData.quantity,
          unit: formData.unit,
          date: formData.date,
          note: formData.note
        });
        setMessage({ type: 'success', text: 'Transaction recorded successfully' });
      }


      resetForm();
      setShowModal(false);
      loadInitialData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (type) => {
    resetForm();
    setFormData(prev => ({ ...prev, type }));
    setShowModal(true);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      partyId: transaction.party?._id || transaction.party || '',
      productId: transaction.product?._id || transaction.product || '',
      type: transaction.type,
      quantity: transaction.quantity,
      unit: transaction.unit || 'pcs',
      date: new Date(transaction.date).toISOString().split('T')[0],
      note: transaction.note || ''
    });
    setShowModal(true);
    setMessage({ type: '', text: '' });
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(id);
      loadInitialData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete transaction' });
    }
  };

  const resetForm = () => {
    setFormData({
      partyId: '',
      productId: '',
      type: 'delivered',
      quantity: '',
      unit: 'linear',
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    setEditingTransaction(null);
    setMessage({ type: '', text: '' });
  };


  const filteredTransactions = transactions
    .filter(t => {
      // Use denormalized fields for filtering to be resilient to missing product references
      if (filters.name && !t.productName.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.party && (t.party?._id || t.party) !== filters.party) return false;
      if (filters.size && t.size !== filters.size) return false;
      if (filters.weight && String(t.product?.weight || '') !== filters.weight) return false;
      if (filters.type && t.type !== filters.type) return false;
      if (filters.productType && (t.productType || 'PPF TF') !== filters.productType) return false;
      if (filters.startDate && new Date(t.date) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(t.date) > new Date(filters.endDate)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalItems = filteredTransactions.length;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const selectedProduct = products.find(p => p._id === formData.productId);

  // Calculate current stock in the selected unit for the selected product
  const calculateSlots = () => {
    if (!selectedProduct) {
      return '0.0';
    }

    // Use the product's quantity field (stored in PCS)
    const totalPcs = selectedProduct.quantity || 0;

    // Convert to the selected unit
    if (formData.unit === 'pcs') {
      return totalPcs.toFixed(1);
    } else if (formData.unit === 'packet') {
      const packets = totalPcs / selectedProduct.pcsPerPacket;
      return packets.toFixed(1);
    } else { // linear
      const pcsPerLinear = selectedProduct.packetsPerLinear * selectedProduct.pcsPerPacket;
      const linear = pcsPerLinear > 0 ? totalPcs / pcsPerLinear : 0;
      return linear.toFixed(1);
    }
  };

  const getLinearValue = (t) => {
    const p = products.find(prod => prod._id === (t.product?._id || t.product));
    if (p && p.packetsPerLinear > 0 && p.pcsPerPacket > 0) {
      return fromPcs(t.quantityInPcs, 'linear', p);
    }
    // Fallback: if we can't find product or factors, try to convert from its own unit if linear
    if (t.unit === 'linear') return t.quantity;
    return null; // Signals we should show the original unit if we can't calculate linear
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      {/* Header with Add Transaction Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 mt-1">Manage inventory movements</p>
        </div>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 md:p-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                {editingTransaction
                  ? 'Edit Transaction'
                  : formData.type === 'produce'
                    ? 'Add Production'
                    : 'Add Delivery'}
              </h2>


              <form onSubmit={handleSubmit} className="space-y-6">
                {message.text && (
                  <div className={`p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Party Dropdown */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Party <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="partyId"
                      required
                      disabled={!isEditable}
                      value={formData.partyId}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 bg-white ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                    >
                      <option value="">Select a party</option>
                      {parties.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Product Dropdown */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="productId"
                      required
                      value={formData.productId}
                      onChange={handleFormChange}
                      disabled={!formData.partyId || !isEditable}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400 ${!isEditable ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="">{formData.partyId ? 'Select a product' : 'Select a party first'}</option>
                      {products
                        .filter(p => !formData.partyId || (p.party?._id || p.party) === formData.partyId)
                        .map(p => (
                          <option key={p._id} value={p._id}>
                            {p.name} - {p.size} ({p.type}) - {p.weight}gm
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Size (read-only display) */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedProduct?.size || ''}
                      placeholder="280 mm"
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Type, Pkts/Lin, Pcs/Pkt Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                    <input
                      type="text"
                      readOnly
                      value={`${selectedProduct?.type || 'PPF TF'} (${selectedProduct?.weight || 0}gm)`}
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Pkts/Lin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedProduct?.packetsPerLinear || ''}
                      placeholder="48"
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 font-medium text-center outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Pcs/Pkt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedProduct?.pcsPerPacket || ''}
                      placeholder="18"
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 font-medium text-center outline-none"
                    />
                  </div>
                </div>

                {/* Transaction Type and Unit */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="unit"
                      required
                      disabled={!isEditable}
                      value={formData.unit}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 bg-white ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                    >
                      <option value="linear">Linear</option>
                      <option value="packet">Packets</option>
                      <option value="pcs">Pieces</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span> <span className="text-xs text-gray-400 font-normal">(Slots: {calculateSlots()})</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      required
                      disabled={!isEditable}
                      step="0.01"
                      min="0"
                      value={formData.quantity}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Transaction Type
                    </label>
                    <div className={`px-4 py-3 rounded-xl font-bold border ${formData.type === 'produce' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                      {formData.type === 'produce' ? 'Production (Add Stock)' : 'Delivery (Subtract Stock)'}
                    </div>
                    <input type="hidden" name="type" value={formData.type} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      disabled={!isEditable}
                      value={formData.date}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Note <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    name="note"
                    disabled={!isEditable}
                    value={formData.note}
                    onChange={handleFormChange}
                    rows="2"
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 resize-none ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                    placeholder="Add a note (optional)"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  {isEditable && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-[#0081BC] hover:bg-[#006ca0] text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                      ) : (
                        editingTransaction ? 'Update Transaction' : 'Record Transaction'
                      )}
                    </button>
                  )}

                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
          <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Total: {totalItems}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Party</label>
            <select
              name="party"
              value={filters.party}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            >
              <option value="">All</option>
              {parties.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Product</label>
            <select
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            >
              <option value="">All</option>
              {[...new Set((filters.party ? products.filter(p => (p.party?._id || p.party) === filters.party) : products).map(p => p.name))].sort().map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Size</label>
            <select
              name="size"
              value={filters.size}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            >
              <option value="">All</option>
              {[...new Set((filters.party ? products.filter(p => (p.party?._id || p.party) === filters.party) : products).map(p => p.size))].filter(Boolean).sort().map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Product Type</label>
            <select
              name="productType"
              value={filters.productType}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            >
              <option value="">All</option>
              {[...new Set((filters.party ? products.filter(p => (p.party?._id || p.party) === filters.party) : products).map(p => p.type || 'PPF TF'))].sort().map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Weight</label>
            <select
              name="weight"
              value={filters.weight}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            >
              <option value="">All</option>
              {[...new Set((filters.party ? products.filter(p => (p.party?._id || p.party) === filters.party) : products).map(p => p.weight))].filter(w => w !== undefined).sort((a, b) => a - b).map(w => (
                <option key={w} value={w}>{w}gm</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tx Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            >
              <option value="">All</option>
              <option value="produce">Produced</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">From</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">To</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm bg-gray-50/30"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-8">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Party</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Size</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Product Type</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Weight</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">Effect</th>

                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Quantity</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Note</th>
                {isEditable && <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {paginatedTransactions.map((t, idx) => (
                <tr key={t._id || idx} className="hover:bg-indigo-50/10 transition-all">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{format(new Date(t.date), 'dd-MM-yyyy')}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-800">{t.partyName || 'Generic'}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-800">{t.productName}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-500">{t.size}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-500">{t.productType || '-'}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-400">{t.product?.weight || 0}gm</div>
                  </td>
                  <td className="px-8 py-6 text-center whitespace-nowrap">
                    <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold ${t.type === 'produce' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {t.type === 'produce' ? 'P' : 'D'}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className={`text-sm font-extrabold ${t.type === 'produce' ? 'text-green-700' : 'text-red-700'}`}>
                      {(() => {
                        const linear = getLinearValue(t);
                        if (linear !== null) {
                          return `${t.type === 'produce' ? '+' : '-'}${linear.toFixed(1)} LINEAR`;
                        }
                        return `${t.type === 'produce' ? '+' : '-'}${t.quantity.toFixed(1)} ${t.unit || 'pcs'}`;
                      })()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs text-gray-400 line-clamp-1 max-w-[150px]">{t.note || '-'}</div>
                  </td>
                  {isEditable && (
                    <td className="px-8 py-6 text-right whitespace-nowrap flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t._id || t.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-8">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}

export default ManageProducts;
