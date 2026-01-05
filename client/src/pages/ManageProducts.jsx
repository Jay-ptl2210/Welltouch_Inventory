import React, { useState, useEffect } from 'react';
import { getProducts, addTransaction, getTransactions } from '../services/api';
import { format } from 'date-fns';

function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    productName: '',
    size: '',
    type: 'produce',
    quantity: '',
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
      const deliveryQuantity = Number.parseFloat(formData.quantity);
      if (formData.type === 'delivered' && deliveryQuantity > selectedProduct.quantity) {
        setMessage({ 
          type: 'error', 
          text: `Insufficient stock! Current stock: ${selectedProduct.quantity.toFixed(2)}, Delivery quantity: ${deliveryQuantity.toFixed(2)}` 
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
        date: transactionDate,
        note: formData.note || ''
      });

      setMessage({ type: 'success', text: 'Transaction recorded successfully!' });
      setFormData(prev => ({
        ...prev,
        quantity: '',
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
        <h2 className="text-xl md:text-3xl font-bold text-gray-800 mb-3 md:mb-6">Transactions</h2>
        <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Record produce and delivery transactions</p>
        
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

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 mb-6 md:mb-8 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 overflow-hidden">
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

            <div>
              <label htmlFor="quantity" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Quantity <span className="text-red-500">*</span>
                {formData.productName && formData.size && formData.type === 'delivered' && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Stock: {products.find(p => p.name === formData.productName && p.size === formData.size)?.quantity.toFixed(2) || '0.00'})
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
                max={formData.type === 'delivered' && formData.productName && formData.size 
                  ? products.find(p => p.name === formData.productName && p.size === formData.size)?.quantity 
                  : undefined}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-primary-600 text-white py-2 md:py-3 px-6 md:px-8 text-sm md:text-base rounded-lg font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
          >
            {loading ? 'Processing...' : 'Record Transaction'}
          </button>
        </form>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction, index) => (
                  <tr key={transaction._id || transaction.id || `transaction-${index}`} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">{format(new Date(transaction.date), 'dd-MM-yyyy')}</span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.productName}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.size}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">
                        {transaction.type === 'produce' ? '+' : '-'}
                        {transaction.quantity.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-sm text-gray-500">
                      {transaction.note ? (
                        <span className="break-words">{transaction.note}</span>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
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
