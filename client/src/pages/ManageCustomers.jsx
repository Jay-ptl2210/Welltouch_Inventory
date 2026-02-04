import React, { useState, useEffect } from 'react';
import { getCustomers, addCustomer, deleteCustomer } from '../services/api';

function ManageCustomers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        address: ''
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const response = await getCustomers();
            setCustomers(response.data.data || response.data);
        } catch (error) {
            console.error('Failed to load customers', error);
            setMessage({ type: 'error', text: 'Failed to load customers' });
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await addCustomer(formData);
            setMessage({ type: 'success', text: 'Customer added successfully!' });
            setFormData({ name: '', address: '' });
            loadCustomers();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to add customer'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;

        try {
            await deleteCustomer(id);
            setMessage({ type: 'success', text: 'Customer deleted successfully!' });
            loadCustomers();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete customer' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            New Customer
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Customer Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-sm text-slate-700 transition-all"
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleFormChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-sm text-slate-700 transition-all"
                                    placeholder="Optional address"
                                    rows="3"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Customer'}
                            </button>
                        </form>

                        {message.text && (
                            <div className={`mt-4 p-3 rounded-xl text-xs font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                </div>

                {/* List Section */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Customer Directory</h2>
                            <span className="bg-white text-slate-400 text-[10px] font-black px-2 py-1 rounded-full border border-slate-100 shadow-sm">{customers.length} Accounts</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                                        <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-black text-slate-700">{c.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{c.address || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(c._id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customers.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-slate-400 font-bold italic">
                                                No customers found. Add your first customer to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ManageCustomers;
