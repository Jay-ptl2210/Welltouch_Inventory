import React, { useState } from 'react';
import { addProduct } from '../services/api';

function AddProduct() {
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    quantity: 'Linear', // Measurement unit: Linear or pcs
    previousStock: '0' // Actual numeric quantity
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Use previousStock field as the numeric quantity value
      const productData = {
        name: formData.name,
        size: formData.size,
        quantity: parseFloat(formData.previousStock) || 0, // Use previousStock as the numeric quantity
        previousStock: parseFloat(formData.previousStock) || 0 // Store the same value in previousStock
      };
      await addProduct(productData);
      setMessage({ type: 'success', text: 'Product added successfully!' });
      setFormData({
        name: '',
        size: '',
        quantity: 'Linear',
        previousStock: '0'
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add product' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-3 md:p-8">
        <h2 className="text-xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Add New Product</h2>
        
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

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <label htmlFor="name" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label htmlFor="size" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Size <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="size"
              name="size"
              required
              value={formData.size}
              onChange={handleChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="e.g., Small, Medium, Large or specific size"
            />
          </div>

          <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
            <label htmlFor="quantity" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Measurement Unit <span className="text-red-500">*</span>
            </label>
            <select
              id="quantity"
              name="quantity"
              required
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
              style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
            >
              <option value="Linear">Linear</option>
              <option value="pcs">pcs</option>
            </select>
          </div>

          <div>
            <label htmlFor="previousStock" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="previousStock"
              name="previousStock"
              required
              step="0.01"
              min="0"
              value={formData.previousStock}
              onChange={handleChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              placeholder="Enter quantity"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 md:py-3 px-6 text-sm md:text-base rounded-lg font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
          >
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddProduct;
