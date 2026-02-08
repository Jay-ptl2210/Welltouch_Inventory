import React, { useState, useEffect } from 'react';
import { getProducts, addTransaction, updateTransaction, getTransactions, deleteTransaction, getParties } from '../services/api';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { toPcs, fromPcs } from '../utils/calculations';

function Input() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [editingTransaction, setEditingTransaction] = useState(null);

    const isEditable = user?.role === 'super_user' || user?.permissions?.production === 'edit';

    const [formData, setFormData] = useState({
        partyId: '',
        productId: '',
        type: 'produce',
        quantity: '',
        unit: 'linear',
        date: new Date().toISOString().split('T')[0],
        note: ''
    });

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
            setProducts(productsRes.data);
            setTransactions(transactionsRes.data.filter(t => t.type === 'produce'));
            setParties(partiesRes.data);
        } catch (err) {
            console.error('Error loading data:', err);
            setMessage({ type: 'error', text: 'Failed to load data' });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const selectedProduct = products.find(p => p._id === formData.productId);
            if (!selectedProduct) throw new Error('Please select a product');

            if (editingTransaction) {
                await updateTransaction(editingTransaction._id, {
                    productId: selectedProduct._id,
                    productName: selectedProduct.name,
                    size: selectedProduct.size,
                    type: 'produce',
                    quantity: formData.quantity,
                    unit: formData.unit,
                    date: formData.date,
                    note: formData.note
                });
                setMessage({ type: 'success', text: 'Production updated successfully' });
            } else {
                await addTransaction({
                    productId: selectedProduct._id,
                    productName: selectedProduct.name,
                    size: selectedProduct.size,
                    type: 'produce',
                    quantity: formData.quantity,
                    unit: formData.unit,
                    date: formData.date,
                    note: formData.note
                });
                setMessage({ type: 'success', text: 'Production recorded successfully' });
            }
            setFormData({
                partyId: '',
                productId: '',
                type: 'produce',
                quantity: '',
                unit: 'linear',
                date: new Date().toISOString().split('T')[0],
                note: ''
            });
            setEditingTransaction(null);
            loadInitialData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (transaction) => {
        setEditingTransaction(transaction);
        setFormData({
            partyId: transaction.party?._id || transaction.party || '',
            productId: transaction.product?._id || transaction.product || '',
            type: 'produce',
            quantity: transaction.quantity,
            unit: transaction.unit || 'packet',
            date: new Date(transaction.date).toISOString().split('T')[0],
            note: transaction.note || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const selectedProduct = products.find(p => p._id === formData.productId);

    const paginatedTransactions = transactions.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );


    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {editingTransaction ? 'Edit Production' : 'Production Form'}
                </h1>
                <p className="text-gray-500 mb-8">
                    {editingTransaction ? `Editing entry from ${format(new Date(editingTransaction.date), 'dd-MM-yyyy')}` : 'Record new production entries here'}
                </p>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Party</label>
                        <select
                            name="partyId"
                            required
                            disabled={!isEditable}
                            value={formData.partyId}
                            onChange={handleFormChange}
                            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700 bg-white ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                        >
                            <option value="">Select a party</option>
                            {parties.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Product</label>
                        <select
                            name="productId"
                            required
                            value={formData.productId}
                            onChange={handleFormChange}
                            disabled={!formData.partyId || !isEditable}
                            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400 ${!isEditable ? 'cursor-not-allowed' : ''}`}
                        >
                            <option value="">{formData.partyId ? 'Select a product' : 'Select a party first'}</option>
                            {products
                                .filter(p => !formData.partyId || (p.party?._id || p.party) === formData.partyId)
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} - {p.size} ({p.type}) - {p.weight}gm | {p.packetsPerLinear} Pkt/Lin, {p.pcsPerPacket} Pcs/Pkt
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Unit</label>
                        <select
                            name="unit"
                            required
                            disabled={!isEditable}
                            value={formData.unit}
                            onChange={handleFormChange}
                            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700 bg-white ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                        >
                            <option value="packet">Packets</option>
                            <option value="linear">Linear</option>
                            <option value="pcs">Pieces</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                        <input
                            type="number"
                            name="quantity"
                            required
                            disabled={!isEditable}
                            step="0.01"
                            min="0"
                            value={formData.quantity}
                            onChange={handleFormChange}
                            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700 ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                            placeholder="Amount"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                        <input
                            type="date"
                            name="date"
                            disabled={!isEditable}
                            value={formData.date}
                            onChange={handleFormChange}
                            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700 ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                        />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Note (Optional)</label>
                        <input
                            type="text"
                            name="note"
                            disabled={!isEditable}
                            value={formData.note}
                            onChange={handleFormChange}
                            className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-gray-700 ${!isEditable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                            placeholder="Add any additional details..."
                        />
                    </div>

                    <div className="md:col-span-2 lg:col-span-1 flex items-end">
                        {isEditable && (
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full ${editingTransaction ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                            >
                                {loading ? 'Processing...' : editingTransaction ? 'Update Production' : 'Add Production'}
                            </button>
                        )}
                        {editingTransaction && isEditable && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingTransaction(null);
                                    setFormData({
                                        productId: '',
                                        type: 'produce',
                                        quantity: '',
                                        unit: 'linear',
                                        date: new Date().toISOString().split('T')[0],
                                        note: ''
                                    });
                                }}
                                className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-6 rounded-xl transition-all"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>

                {message.text && (
                    <div className={`mt-6 p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Production History</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Quantity</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Note</th>
                                {isEditable && <th className="px-6 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedTransactions.map((t) => (
                                <tr key={t._id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{format(new Date(t.date), 'dd-MM-yyyy')}</td>
                                    <td className="px-6 py-4 text-sm text-gray-800">{t.productName} ({t.size}) - {products.find(p => p._id === (t.product?._id || t.product))?.weight || 0}gm</td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500 uppercase">{t.productType}</td>
                                    <td className="px-6 py-4 text-sm font-extrabold text-green-700">
                                        {(() => {
                                            const val = Number(t.quantity) || 0;
                                            const unit = (t.unit || 'pcs').toUpperCase();
                                            return `+${val.toLocaleString()} ${unit}`;
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400 italic line-clamp-1">{t.note || '-'}</td>
                                    {isEditable && (
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => handleEdit(t)} className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors" title="Edit">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(t._id)} className="p-2 text-red-400 hover:text-red-600 transition-colors" title="Delete">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {transactions.length > pageSize && (
                    <div className="mt-8">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={transactions.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Input;
