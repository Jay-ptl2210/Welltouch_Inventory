import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getParties, addParty, updateParty, deleteParty, getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/api';

function ManageEntities() {
    const [entities, setEntities] = useState([]);
    const [filteredEntities, setFilteredEntities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // all, party, customer
    const [showModal, setShowModal] = useState(false);
    const [editingEntity, setEditingEntity] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        type: 'party', // Default for new
        name: '',
        gst: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        loadEntities();
    }, []);

    useEffect(() => {
        filterData();
    }, [search, typeFilter, entities]);

    const loadEntities = async () => {
        try {
            setLoading(true);
            const [partiesRes, customersRes] = await Promise.all([
                getParties(),
                getCustomers()
            ]);

            const parties = (partiesRes.data || []).map(p => ({
                ...p,
                entityType: p.isBoth ? 'both' : 'party'
            }));

            const customers = (customersRes.data.data || customersRes.data || []).map(c => ({
                ...c,
                entityType: c.isBoth ? 'both' : 'customer'
            }));

            // Combine all entities
            setEntities([...parties, ...customers]);

            console.log('Loaded entities:', {
                parties: parties.length,
                customers: customers.length,
                bothParties: parties.filter(p => p.isBoth).length,
                bothCustomers: customers.filter(c => c.isBoth).length
            });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to load entities' });
        } finally {
            setLoading(false);
        }
    };

    const filterData = () => {
        let result = entities;

        if (typeFilter !== 'all') {
            result = result.filter(e => {
                // Show 'both' entities in both party and customer filters
                if (e.entityType === 'both') return true;
                return e.entityType === typeFilter;
            });
        }

        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(e =>
                e.name.toLowerCase().includes(lowerSearch) ||
                (e.gst && e.gst.toLowerCase().includes(lowerSearch))
            );
        }

        setFilteredEntities(result);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (editingEntity) {
                const dataToSave = {
                    ...formData,
                    isBoth: formData.type === 'both'
                };

                // Determine which API to use - 'both' entities are stored as parties
                if (editingEntity.entityType === 'party' || editingEntity.entityType === 'both') {
                    await updateParty(editingEntity._id, dataToSave);
                } else {
                    await updateCustomer(editingEntity._id, dataToSave);
                }
                setMessage({ type: 'success', text: 'Updated successfully' });
            } else {
                // When creating new
                if (formData.type === 'both') {
                    // Create only in Party with isBoth flag
                    await addParty({ ...formData, isBoth: true });
                    setMessage({ type: 'success', text: 'Created as Party & Customer (unified)' });
                } else if (formData.type === 'party') {
                    await addParty({ ...formData, isBoth: false });
                    setMessage({ type: 'success', text: 'Created successfully' });
                } else {
                    await addCustomer({ ...formData, isBoth: false });
                    setMessage({ type: 'success', text: 'Created successfully' });
                }
            }
            setShowModal(false);
            resetForm();
            loadEntities();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Operation failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (entity) => {
        if (!window.confirm(`Delete this ${entity.entityType === 'both' ? 'Party & Customer' : entity.entityType}?`)) return;
        try {
            const idToDelete = entity.originalId || entity._id;

            if (entity.entityType === 'party' || entity.entityType === 'both') {
                await deleteParty(idToDelete);
            } else {
                await deleteCustomer(idToDelete);
            }
            loadEntities();
            setMessage({ type: 'success', text: 'Deleted successfully' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete' });
        }
    };

    const openModal = (entity = null) => {
        if (entity) {
            // Use originalId if it exists (for 'both' entity copies)
            const actualEntity = entity.originalId ? {
                ...entity,
                _id: entity.originalId
            } : entity;

            setEditingEntity(actualEntity);
            const entityType = entity.isBoth ? 'both' : entity.entityType;
            setFormData({
                type: entityType,
                name: entity.name || '',
                gst: entity.gst || '',
                phone: entity.phone || '',
                address: entity.address || ''
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingEntity(null);
        setFormData({ type: 'party', name: '', gst: '', phone: '', address: '' });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage Entities</h1>
                    <p className="text-gray-500">Unified Parties & Customers Registry</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add New Entity
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
                    {/* Filter Type */}
                    <div className="flex-shrink-0">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="h-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-gray-700 cursor-pointer"
                        >
                            <option value="all">All Entities</option>
                            <option value="party">Parties</option>
                            <option value="customer">Customers</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Search by name or GST..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">GSTIN</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Address</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredEntities.map((entity) => (
                                <tr key={`${entity.entityType}-${entity._id}`} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${entity.entityType === 'party' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {entity.entityType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{entity.name}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{entity.gst || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{entity.phone || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{entity.address || '-'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openModal(entity)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => handleDelete(entity)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredEntities.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">No records found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingEntity ? 'Edit' : 'Add New'} Entity
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Entity Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="party"
                                            checked={formData.type === 'party'}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-4 h-4 text-primary-600"
                                        />
                                        <span className="text-sm font-medium">Party</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="customer"
                                            checked={formData.type === 'customer'}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-4 h-4 text-primary-600"
                                        />
                                        <span className="text-sm font-medium">Customer</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="both"
                                            checked={formData.type === 'both'}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-4 h-4 text-primary-600"
                                        />
                                        <span className="text-sm font-medium">Both</span>
                                    </label>
                                </div>
                            </div>


                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">GSTIN</label>
                                <input
                                    type="text"
                                    value={formData.gst}
                                    onChange={e => setFormData({ ...formData, gst: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Optional GSTIN"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Optional phone"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                    rows="3"
                                    placeholder="Optional address"
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Entity'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {message.text && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl border font-bold text-sm animate-in slide-in-from-bottom-5 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default ManageEntities;
