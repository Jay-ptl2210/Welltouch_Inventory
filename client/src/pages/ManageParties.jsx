import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParties, addParty, deleteParty } from '../services/api';
import Pagination from '../components/Pagination';

function ManageParties() {
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ name: '' });

    const [message, setMessage] = useState({ type: '', text: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const navigate = useNavigate();

    useEffect(() => {
        loadParties();
    }, []);

    const loadParties = async () => {
        try {
            setLoading(true);
            const response = await getParties();
            setParties(response.data);
        } catch (err) {
            setMessage({ type: 'error', text: 'Entity registry synchronization failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addParty(formData);
            setMessage({ type: 'success', text: 'Entity registered successfully' });
            setFormData({ name: '' });
            loadParties();

        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Registration failure' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Purge this entity from the registry?')) return;
        try {
            await deleteParty(id);
            loadParties();
        } catch (err) {
            setMessage({ type: 'error', text: 'Purge operation failed' });
        }
    };

    const totalItems = parties.length;
    const paginatedParties = parties.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Parties Registry</h1>
                    <p className="text-gray-600 mt-1">Manage and track all business associates and parties</p>
                </div>
                <button
                    onClick={() => navigate('/add-party')}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Register Party
                </button>
            </div>

            <div className="space-y-6">
                {message.text && (
                    <div className={`p-4 rounded-lg font-medium border ${message.type === 'success' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Saved Parties</h2>
                        <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            Total: {parties.length}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                            <p className="text-gray-500 font-medium">Synchronizing parties registry...</p>
                        </div>
                    ) : (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedParties.map(party => (
                                <div key={party._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group">
                                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UID: {party._id.slice(-8).toUpperCase()}</p>
                                        <button
                                            onClick={() => handleDelete(party._id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1">Company / Individual</p>
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{party.name}</h3>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Verified</span>
                                        </div>
                                    </div>
                                </div>

                            ))}
                            {parties.length === 0 && (
                                <div className="col-span-full py-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
                                    <p className="text-gray-400 font-medium italic">Your party registry is currently empty.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
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

export default ManageParties;
