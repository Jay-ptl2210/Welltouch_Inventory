import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addParty } from '../services/api';

function AddParty() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addParty(formData);
            setMessage({ type: 'success', text: 'Party registered successfully!' });
            setTimeout(() => navigate('/parties'), 1500);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Register New Party</h2>
                    <p className="text-gray-600 text-sm mt-1">Add a new business associate to your registry</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {message.text && (
                        <div className={`p-4 rounded-lg font-medium border ${message.type === 'success' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name / Company Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter name..."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-medium"
                        />
                    </div>

                    <div className="form-group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Enter contact number..."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-medium"
                        />
                    </div>

                    <div className="form-group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Office Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Enter complete office address..."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none h-32 resize-none font-medium"
                        ></textarea>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/parties')}
                            className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors border border-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors shadow-md disabled:opacity-50"
                        >
                            {loading ? 'Registering...' : 'Register Party'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddParty;
