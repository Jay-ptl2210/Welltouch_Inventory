import React, { useState, useEffect } from 'react';
import { getTransports, addTransport, updateTransport, deleteTransport } from '../services/api';

function ManageTransports() {
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showModal, setShowModal] = useState(false);
    const [editingTransport, setEditingTransport] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        vehicleInput: '',
        vehicles: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getTransports();
            setTransports(res.data);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to load transports' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddVehicle = () => {
        if (!formData.vehicleInput.trim()) return;
        if (formData.vehicles.includes(formData.vehicleInput.trim().toUpperCase())) {
            setMessage({ type: 'error', text: 'Vehicle number already added' });
            return;
        }
        setFormData(prev => ({
            ...prev,
            vehicles: [...prev.vehicles, prev.vehicleInput.trim().toUpperCase()],
            vehicleInput: ''
        }));
        setMessage({ type: '', text: '' });
    };

    const removeVehicle = (v) => {
        setFormData(prev => ({
            ...prev,
            vehicles: prev.vehicles.filter(item => item !== v)
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        setLoading(true);
        try {
            const dataToSave = {
                name: formData.name.trim(),
                vehicles: formData.vehicles
            };

            if (editingTransport) {
                await updateTransport(editingTransport._id, dataToSave);
                setMessage({ type: 'success', text: 'Transport updated successfully' });
            } else {
                await addTransport(dataToSave);
                setMessage({ type: 'success', text: 'Transport added successfully' });
            }
            setShowModal(false);
            resetForm();
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Operation failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this transport agency and all its vehicles?')) return;
        try {
            await deleteTransport(id);
            loadData();
            setMessage({ type: 'success', text: 'Deleted successfully' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete' });
        }
    };

    const openModal = (transport = null) => {
        if (transport) {
            setEditingTransport(transport);
            setFormData({
                name: transport.name,
                vehicleInput: '',
                vehicles: transport.vehicles || []
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingTransport(null);
        setFormData({ name: '', vehicleInput: '', vehicles: [] });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-[1200px]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                <div className="flex items-center gap-5">
                    <div className="bg-sky-500 p-4 rounded-3xl shadow-lg shadow-sky-200">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Transport Details</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Manage Fleet & Logistics Agencies</p>
                    </div>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-sky-600/20 transition-all flex items-center gap-3 active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    ADD TRANSPORT
                </button>
            </div>

            {loading && transports.length === 0 ? (
                <div className="py-40 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-sky-100 border-t-sky-500 mx-auto"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {transports.slice().sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                        <div key={t._id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                    <p className="text-sky-500 text-[10px] font-black uppercase tracking-widest">Agency Name</p>
                                    <h3 className="text-2xl font-black text-slate-800 leading-tight">{t.name}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(t)} className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(t._id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Registered Vehicles ({t.vehicles?.length || 0})</p>
                                <div className="flex flex-wrap gap-2">
                                    {t.vehicles && t.vehicles.length > 0 ? (
                                        t.vehicles.map((v, i) => (
                                            <span key={i} className="text-[10px] font-black bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-100 group-hover:border-sky-100 shadow-sm">
                                                {v}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-300 text-[10px] italic font-bold">No vehicles added yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {transports.length === 0 && !loading && (
                        <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                            <div className="max-w-xs mx-auto space-y-4">
                                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1" /></svg>
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Your fleet registry is empty</p>
                                <button onClick={() => openModal()} className="text-sky-600 font-black text-sm hover:underline">Start by adding your first transport agency</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">
                                    {editingTransport ? 'Edit Transport' : 'New Transport Agency'}
                                </h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fleet Details & Vehicle List</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-10 space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Agency Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none font-bold text-slate-700 transition-all"
                                    placeholder="Ex: Shree Maruti Courier, Professional Transport"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Manage Vehicles</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={formData.vehicleInput}
                                        onChange={e => setFormData({ ...formData, vehicleInput: e.target.value })}
                                        className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none font-black text-slate-700 transition-all placeholder:font-bold"
                                        placeholder="Enter Vehicle No. (GJ-XX-XXXX)"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVehicle())}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddVehicle}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 rounded-2xl shadow-lg transition-all active:scale-95"
                                    >
                                        ADD
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[80px]">
                                    {formData.vehicles.map((v, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-2 transition-all hover:border-red-200 group">
                                            <span className="text-[10px] font-black text-slate-700">{v}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeVehicle(v)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {formData.vehicles.length === 0 && (
                                        <div className="w-full flex items-center justify-center text-slate-300 font-bold text-[10px] uppercase tracking-widest italic">
                                            No vehicles listed for this agency
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-sky-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? 'SAVING...' : 'SAVE TRANSPORT DETAILS'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {message.text && (
                <div className={`fixed bottom-8 right-8 p-6 rounded-[1.5rem] shadow-2xl border-2 font-black text-xs uppercase tracking-widest z-50 animate-in slide-in-from-bottom-5 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`h-2 w-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                        {message.text}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageTransports;
