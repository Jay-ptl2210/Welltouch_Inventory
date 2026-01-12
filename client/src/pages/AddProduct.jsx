import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addProduct, getParties } from '../services/api';

function AddProduct() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    type: 'PPF TF',
    packetsPerLinear: '',
    pcsPerPacket: '',
    quantity: '',
    quantityUnit: 'linear', // linear, packet, pcs
    party: ''
  });
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const response = await getParties();
      setParties(response.data);
    } catch (error) {
      console.error('Failed to load parties', error);
    }
  };

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
      const productData = {
        name: formData.name,
        size: formData.size,
        type: formData.type,
        packetsPerLinear: parseFloat(formData.packetsPerLinear) || 0,
        pcsPerPacket: parseFloat(formData.pcsPerPacket) || 0,
        quantity: parseFloat(formData.quantity) || 0,
        quantityUnit: formData.quantityUnit,
        party: formData.party || undefined
      };
      await addProduct(productData);
      setMessage({ type: 'success', text: 'Product added successfully!' });
      setFormData({
        name: '',
        size: '',
        type: 'PPF TF',
        packetsPerLinear: '',
        pcsPerPacket: '',
        quantity: '',
        quantityUnit: 'linear',
        party: ''
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
            className={`mb-3 md:mb-4 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base rounded ${message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
              }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <label htmlFor="party" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Party <span className="text-red-500">*</span>
            </label>
            <select
              id="party"
              name="party"
              required
              value={formData.party}
              onChange={handleChange}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
            >
              <option value="">Select a Party</option>
              {parties.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Don't see your party? <span className="text-primary-600 cursor-pointer hover:underline" onClick={() => navigate('/parties')}>Create it here</span>
            </p>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
                placeholder="e.g., Small, Medium, Large"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
              >
                <option value="PPF TF">PPF TF</option>
                <option value="PPF ST">PPF ST</option>
                <option value="Cotton TF">Cotton TF</option>
                <option value="Cotton ST">Cotton ST</option>
                <option value="Ultra">Ultra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label htmlFor="packetsPerLinear" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Packets per Linear <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="packetsPerLinear"
                name="packetsPerLinear"
                required
                step="0.01"
                min="0"
                value={formData.packetsPerLinear}
                onChange={handleChange}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="e.g., 10"
              />
            </div>
            <div>
              <label htmlFor="pcsPerPacket" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Pcs per Packet <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="pcsPerPacket"
                name="pcsPerPacket"
                required
                step="1"
                min="0"
                value={formData.pcsPerPacket}
                onChange={handleChange}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="e.g., 12"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label htmlFor="quantityUnit" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Initial Stock Unit <span className="text-red-500">*</span>
              </label>
              <select
                id="quantityUnit"
                name="quantityUnit"
                required
                value={formData.quantityUnit}
                onChange={handleChange}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
              >
                <option value="linear">Linear</option>
                <option value="packet">Packets</option>
                <option value="pcs">Pieces</option>
              </select>
            </div>
            <div>
              <label htmlFor="quantity" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Initial Stock ({formData.quantityUnit === 'linear' ? 'Linears' : formData.quantityUnit === 'packet' ? 'Packets' : 'Pieces'}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                required
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter initial stock"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex-1 bg-gray-100 text-gray-700 py-2 md:py-3 px-6 text-sm md:text-base rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2 md:py-3 px-6 text-sm md:text-base rounded-lg font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProduct;
