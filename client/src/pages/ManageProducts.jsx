import React, { useState, useEffect } from 'react';
import { getProducts, addTransaction, getTransactions, deleteTransaction, updateTransaction } from '../services/api';
import { format } from 'date-fns';

function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    productName: '',
    size: '',
    type: 'produce',
    quantity: '',
    unit: 'pcs',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });
  const [filters, setFilters] = useState({
    product: '',
    size: '',
    date: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sizes, setSizes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    productName: '',
    size: '',
    type: 'produce',
    quantity: '',
    unit: 'pcs',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });
  const [editSizes, setEditSizes] = useState([]);

  const toPcs = (q, unit, product) => {
    const packetsPerLinear = Number(product.packetsPerLinear) || 0;
    const pcsPerPacket = Number(product.pcsPerPacket) || 0;
    const qty = Number(q);
    if (Number.isNaN(qty) || qty < 0) {
      throw new Error('Quantity must be a positive number');
    }
    if (packetsPerLinear <= 0 || pcsPerPacket <= 0) {
      throw new Error('Invalid conversion factors');
    }
    if (unit === 'linear') return qty * packetsPerLinear * pcsPerPacket;
    if (unit === 'packet') return qty * pcsPerPacket;
    return qty;
  };

  const fromPcs = (pcs, unit, product) => {
    const packetsPerLinear = Number(product.packetsPerLinear) || 0;
    const pcsPerPacket = Number(product.pcsPerPacket) || 0;
    const value = Number(pcs) || 0;
    if (unit === 'linear' && packetsPerLinear > 0 && pcsPerPacket > 0) {
      return value / (packetsPerLinear * pcsPerPacket);
    }
    if (unit === 'packet' && pcsPerPacket > 0) {
      return value / pcsPerPacket;
    }
    return value;
  };

  useEffect(() => {
    loadProducts();
    loadTransactions();
  }, []);

  useEffect(() => {
    if (formData.productName) {
      const productSizes = [...new Set(
        products
          .filter(p => p.name === formData.productName)
          .map(p => p.size)
      )];
      setSizes(productSizes);
      if (!productSizes.includes(formData.size)) {
        setFormData(prev => ({ ...prev, size: '' }));
      }
    } else {
      setSizes([]);
    }
  }, [formData.productName, products]);

  useEffect(() => {
    if (editForm.productName) {
      const productSizes = [...new Set(
        products
          .filter(p => p.name === editForm.productName)
          .map(p => p.size)
      )];
      setEditSizes(productSizes);
      if (!productSizes.includes(editForm.size)) {
        setEditForm(prev => ({ ...prev, size: '' }));
      }
    } else {
      setEditSizes([]);
    }
  }, [editForm.productName, products]);

  const loadProducts = async () => {
    try {
      const response = await getProducts();
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await getTransactions();
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Find the product that matches both name and size
      const selectedProduct = products.find(
        p => p.name === formData.productName && p.size === formData.size
      );
      if (!selectedProduct) {
        throw new Error('Product with selected name and size not found');
      }

      // Validate delivery quantity before submitting
      const deliveryQuantityPcs = toPcs(formData.quantity, formData.unit, selectedProduct);
      if (formData.type === 'delivered' && deliveryQuantityPcs > selectedProduct.quantity) {
        setMessage({ 
          type: 'error', 
          text: `Insufficient stock! Current stock: ${selectedProduct.quantity.toFixed(2)} pcs, Delivery quantity: ${deliveryQuantityPcs.toFixed(2)} pcs` 
        });
        setLoading(false);
        return;
      }

      const transactionDate = formData.date 
        ? new Date(formData.date).toISOString()
        : new Date().toISOString();

      // Use _id if available, otherwise fall back to id (Mongoose converts _id to id in JSON)
      const productId = selectedProduct._id || selectedProduct.id;
      
      if (!productId) {
        throw new Error('Product ID not found');
      }

      await addTransaction({
        productId: productId,
        productName: formData.productName,
        size: formData.size,
        type: formData.type,
        quantity: formData.quantity,
        unit: formData.unit,
        date: transactionDate,
        note: formData.note || ''
      });

      setMessage({ type: 'success', text: 'Transaction recorded successfully!' });
      setFormData(prev => ({
        ...prev,
        quantity: '',
        unit: 'pcs',
        note: '',
        date: format(new Date(), 'yyyy-MM-dd')
      }));
      await loadProducts();
      await loadTransactions();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to record transaction' 
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditTransaction = (transaction) => {
    setEditingId(transaction._id || transaction.id);
    setEditForm({
      productName: transaction.productName,
      size: transaction.size,
      type: transaction.type,
      quantity: transaction.quantity.toString(),
      unit: transaction.unit || 'pcs',
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      note: transaction.note || ''
    });
    setMessage({ type: '', text: '' });
  };

  const cancelEditTransaction = () => {
    setEditingId(null);
    setEditForm({
      productName: '',
      size: '',
      type: 'produce',
      quantity: '',
      unit: 'pcs',
      date: format(new Date(), 'yyyy-MM-dd'),
      note: ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveTransaction = async (transaction) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Find the product matching selected name and size
      const targetProduct = products.find(
        p => p.name === editForm.productName && p.size === editForm.size
      );

      if (!targetProduct) {
        throw new Error('Selected product and size not found');
      }

      const resolvedProductId = targetProduct._id || targetProduct.id;

      const parsedQuantity = Number.parseFloat(editForm.quantity);
      if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
        throw new Error('Quantity must be a positive number');
      }

      const deltaPcs = toPcs(parsedQuantity, editForm.unit, targetProduct);

      // If delivered, validate stock using latest product data
      if (editForm.type === 'delivered' && deltaPcs > targetProduct.quantity) {
        throw new Error(
          `Insufficient stock! Current stock: ${targetProduct.quantity.toFixed(2)} pcs, Delivery quantity: ${deltaPcs.toFixed(2)} pcs`
        );
      }

      const transactionDate = editForm.date
        ? new Date(editForm.date).toISOString()
        : new Date().toISOString();

      await updateTransaction(transaction._id || transaction.id, {
        productId: resolvedProductId,
        productName: editForm.productName,
        size: editForm.size,
        type: editForm.type,
        quantity: parsedQuantity,
        unit: editForm.unit,
        date: transactionDate,
        note: editForm.note || ''
      });

      setMessage({ type: 'success', text: 'Transaction updated successfully!' });
      setEditingId(null);
      await loadProducts();
      await loadTransactions();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.message || 'Failed to update transaction'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      await deleteTransaction(id);
      setMessage({ type: 'success', text: 'Transaction deleted successfully!' });
      await loadProducts();
      await loadTransactions();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete transaction'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      if (filters.product && transaction.productName !== filters.product) return false;
      if (filters.size && transaction.size !== filters.size) return false;
      if (filters.date) {
        const transactionDate = format(new Date(transaction.date), 'yyyy-MM-dd');
        if (transactionDate !== filters.date) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by date and time descending (newest first)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const dateDiff = dateB.getTime() - dateA.getTime();
      
      // If dates are exactly the same, sort by createdAt (newest first)
      if (dateDiff === 0) {
        const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdAtB - createdAtA; // Newest first
      }
      
      return dateDiff; // Newest date first
    });

  const uniqueProductNames = [...new Set(products.map(p => p.name))];
  const uniqueSizes = [...new Set(products.map(p => p.size))];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-3 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-3 md:mb-6">
          <div>
            <h2 className="text-xl md:text-3xl font-bold text-gray-800">Transactions</h2>
            <p className="text-sm md:text-base text-gray-600">Record produce and delivery transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {showForm ? 'Close Form' : 'Add Transaction'}
            </button>
          </div>
        </div>

        {message.text && (
          <div
            className={`mb-3 md:mb-4 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base rounded ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-0 sm:px-4">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowForm(false)} />
            <div className="relative bg-white rounded-none sm:rounded-lg shadow-2xl w-full sm:max-w-xl max-h-screen sm:max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg md:text-2xl font-bold text-gray-800">Add Transaction</h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                  <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                    <label htmlFor="productName" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="productName"
                      name="productName"
                      required
                      value={formData.productName}
                      onChange={handleFormChange}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                      style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
                    >
                      <option value="">Select a product</option>
                      {uniqueProductNames.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                    <label htmlFor="size" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Size <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="size"
                      name="size"
                      required
                      value={formData.size}
                      onChange={handleFormChange}
                      disabled={!formData.productName}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
                      style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
                    >
                      <option value="">Select size</option>
                      {sizes.map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                    <label htmlFor="type" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Transaction Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleFormChange}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                      style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
                    >
                      <option value="produce">Produce (Add)</option>
                      <option value="delivered">Delivered (Subtract)</option>
                    </select>
                  </div>

                  <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                    <label htmlFor="unit" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="unit"
                      name="unit"
                      required
                      value={formData.unit}
                      onChange={handleFormChange}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                    >
                      <option value="linear">Linear</option>
                      <option value="packet">Packets</option>
                      <option value="pcs">Pieces</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Quantity <span className="text-red-500">*</span>
                      {formData.productName && formData.size && formData.type === 'delivered' && (
                        <span className="ml-2 text-xs text-gray-500">
                          {(() => {
                            const product = products.find(p => p.name === formData.productName && p.size === formData.size);
                            if (!product) return '(Stock: 0)';
                            const available = fromPcs(product.quantity, formData.unit, product);
                            return `(Stock: ${available.toFixed(2)} ${formData.unit === 'linear' ? 'linear' : formData.unit === 'packet' ? 'packets' : 'pcs'})`;
                          })()}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      required
                      step="0.01"
                      min="0"
                      max={(() => {
                        if (formData.type !== 'delivered') return undefined;
                        const product = products.find(p => p.name === formData.productName && p.size === formData.size);
                        if (!product) return undefined;
                        return fromPcs(product.quantity, formData.unit, product);
                      })()}
                      value={formData.quantity}
                      onChange={handleFormChange}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="date" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleFormChange}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="note" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Note <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      value={formData.note}
                      onChange={handleFormChange}
                      rows="2"
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
                      placeholder="Add a note (optional)"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Record Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-3 md:p-8">
        <h3 className="text-lg md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">Transaction History</h3>
        
        <div className="mb-4 md:mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 overflow-hidden">
          <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
            <label htmlFor="filter-product" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Filter by Product
            </label>
            <select
              id="filter-product"
              name="product"
              value={filters.product}
              onChange={handleFilterChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
              style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
            >
              <option value="">All Products</option>
              {uniqueProductNames.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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

          <div>
            <label htmlFor="filter-date" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Filter by Date
            </label>
            <input
              type="date"
              id="filter-date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
            <p className="mt-1 text-sm text-gray-500">Transaction history will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction, index) => (
                  <tr key={transaction._id || transaction.id || `transaction-${index}`} className="hover:bg-gray-50">
                    {(() => {
                      const isEditing = editingId === (transaction._id || transaction.id);
                      return (
                        <>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                type="date"
                                name="date"
                                value={editForm.date}
                                onChange={handleEditChange}
                                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                              />
                            ) : (
                              <span className="font-medium">{format(new Date(transaction.date), 'dd-MM-yyyy')}</span>
                            )}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {isEditing ? (
                              <select
                                name="productName"
                                value={editForm.productName}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
                              >
                                <option value="">Select product</option>
                                {uniqueProductNames.map(name => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              transaction.productName
                            )}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isEditing ? (
                              <select
                                name="size"
                                value={editForm.size}
                                onChange={handleEditChange}
                                disabled={!editForm.productName}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">Select size</option>
                                {editSizes.map(size => (
                                  <option key={size} value={size}>
                                    {size}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              transaction.size
                            )}
                    </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                name="type"
                                value={editForm.type}
                                onChange={handleEditChange}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
                              >
                                <option value="produce">Produce (Add)</option>
                                <option value="delivered">Delivered (Subtract)</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                                  transaction.type === 'produce'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                                title={transaction.type === 'produce' ? 'Produce' : 'Delivered'}
                              >
                                {transaction.type === 'produce' ? 'P' : 'D'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <select
                                  name="unit"
                                  value={editForm.unit}
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
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                            ) : (
                              <span className="font-medium">
                                {transaction.type === 'produce' ? '+' : '-'}
                                {transaction.quantity.toFixed(2)} {transaction.unit || 'pcs'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 md:px-6 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <textarea
                                name="note"
                                rows="2"
                                value={editForm.note}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
                                placeholder="Add a note (optional)"
                              />
                            ) : transaction.note ? (
                              <span className="break-words">{transaction.note}</span>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveTransaction(transaction)}
                                  disabled={loading}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                                >
                                  {loading ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditTransaction}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditTransaction(transaction)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(transaction._id || transaction.id)}
                                  disabled={loading}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageProducts;
