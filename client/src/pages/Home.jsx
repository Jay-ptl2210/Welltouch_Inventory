import React, { useState, useEffect } from 'react';
import { getDashboard, getParties, getTransactions } from '../services/api';

import Pagination from '../components/Pagination';

const toCounts = (product) => {
  const packetsPerLinear = Number(product.packetsPerLinear) || 0;
  const pcsPerPacket = Number(product.pcsPerPacket) || 0;
  const pcs = Number(product.quantity) || 0;

  if (packetsPerLinear > 0 && pcsPerPacket > 0) {
    const packets = pcsPerPacket > 0 ? pcs / pcsPerPacket : 0;
    const linears = (packetsPerLinear > 0 && pcsPerPacket > 0)
      ? pcs / (packetsPerLinear * pcsPerPacket)
      : 0;
    return { pcs, packets, linears, hasRatios: true };
  }

  return { pcs, packets: null, linears: null, hasRatios: false };
};

function Home() {
  const [dashboardData, setDashboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    size: '',
    type: '',
    weight: '',
    party: ''
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 12; // 3 rows of 4 items or similar

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const filteredDashboardData = dashboardData.filter(item => {
    // Filter by Name (partial match, case insensitive)
    if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    // Filter by Size (exact match)
    if (filters.size && item.size !== filters.size) {
      return false;
    }
    // Filter by Type
    if (filters.type && item.type !== filters.type) {
      return false;
    }
    // Filter by Weight
    if (filters.weight && String(item.weight) !== filters.weight) {
      return false;
    }
    // Filter by Party
    if (filters.party && (item.party?._id || item.party) !== filters.party) {
      return false;
    }
    return true;
  });

  // Pagination logic
  const totalItems = filteredDashboardData.length;
  const paginatedData = filteredDashboardData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    loadDashboard();
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const response = await getParties();
      setParties(response.data);
    } catch (err) {
      console.error('Failed to load parties', err);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await getDashboard();
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (product) => {
    try {
      setSelectedProduct(product);
      setShowDetailModal(true);
      setModalLoading(true);

      const response = await getTransactions();
      // Filter transactions for this grouped product by attributes
      const filtered = response.data.filter(t =>
        t.productName === product.name &&
        t.size === product.size &&
        (t.productType || 'PPF TF') === (product.type || 'PPF TF') &&
        (t.party?._id || t.party || null) === (product.party?._id || product.party || null) &&
        (t.product?.weight || 0) === (product.weight || 0)
      ).sort((a, b) => new Date(b.date) - new Date(a.date));


      setProductTransactions(filtered);
    } catch (err) {
      console.error('Failed to load product transactions', err);
    } finally {
      setModalLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time inventory monitoring and analysis</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-gray-700 uppercase tracking-wider">Connected</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h2>
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            Showing <span className="font-bold text-primary-600">{filteredDashboardData.length}</span> of <span className="font-bold">{dashboardData.length}</span> items
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Party</label>
            <select
              name="party"
              value={filters.party}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Parties</option>
              {parties.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <select
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Products</option>
              {[...new Set(dashboardData.map(item => item.name))].sort().map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Size</label>
            <select
              name="size"
              value={filters.size}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Sizes</option>
              {[...new Set(dashboardData.map(item => item.size))].filter(Boolean).sort().map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Types</option>
              {[...new Set(dashboardData.map(item => item.type))].filter(Boolean).sort().map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Weight</label>
            <select
              name="weight"
              value={filters.weight}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white font-medium text-sm"
            >
              <option value="">All Weights</option>
              {[...new Set(dashboardData.map(item => item.weight))].filter(w => w !== undefined).sort((a, b) => a - b).map(w => (
                <option key={w} value={w}>{w}gm</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedData.map((item, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="max-w-[70%]">
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1 block truncate">
                    {item.party?.name || 'Generic'}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 truncate" title={item.name}>
                    {item.name}
                  </h3>
                </div>
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-[10px] font-bold rounded uppercase">
                  {item.type || 'Standard'}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded-lg">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Size: <span className="ml-1 font-semibold text-gray-700">{item.size}</span>
                <span className="mx-2 text-gray-300">|</span>
                W: <span className="ml-1 font-semibold text-gray-700">{item.weight || 0}gm</span>
              </div>

              <div className="space-y-4">
                {(() => {
                  const counts = toCounts(item);
                  if (counts.hasRatios) {
                    return (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Linear</div>
                          <div className="text-sm font-bold text-gray-800">{counts.linears.toFixed(1)}</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Pkt</div>
                          <div className="text-sm font-bold text-gray-800">{counts.packets.toFixed(0)}</div>
                        </div>
                        <div className="text-center p-2 bg-primary-600 rounded-lg shadow-sm">
                          <div className="text-[10px] text-primary-100 font-bold uppercase mb-1">Pcs</div>
                          <div className="text-sm font-bold text-white">{counts.pcs.toFixed(0)}</div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col items-center justify-center py-4 px-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <div className="text-xs text-gray-400 font-bold uppercase mb-1">Stock Level</div>
                      <div className="text-2xl font-black text-gray-900">{counts.pcs.toFixed(0)} <span className="text-sm font-bold text-gray-400">PCS</span></div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center group-hover:bg-white transition-colors">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Inventory Active</span>
              <button
                onClick={() => handleViewDetails(item)}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center group/btn"
              >
                Details
                <svg className="w-3.5 h-3.5 ml-1 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedProduct.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-800 px-2 py-0.5 rounded">
                      {selectedProduct.type}
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-800 px-2 py-0.5 rounded">
                      {selectedProduct.size}
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-800 px-2 py-0.5 rounded">
                      {selectedProduct.party?.name || 'Generic'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedProduct(null);
                  setProductTransactions([]);
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Detailed Breakdown Section */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-1 w-4 bg-primary-500 rounded-full"></span>
                    Current Stock
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const counts = toCounts(selectedProduct);
                      return (
                        <>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Linear Meters</div>
                            <div className="text-xl font-black text-slate-900">
                              {counts.hasRatios ? counts.linears.toFixed(1) : '-'}
                            </div>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Packets</div>
                            <div className="text-xl font-black text-slate-900">
                              {counts.hasRatios ? counts.packets.toFixed(0) : '-'}
                            </div>
                          </div>
                          <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100">
                            <div className="text-[10px] font-bold text-primary-600 uppercase mb-1">Total Pieces</div>
                            <div className="text-xl font-black text-primary-700">
                              {counts.pcs.toFixed(0)} <span className="text-xs font-bold opacity-60">PCS</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Transaction History in Modal */}
                <div className="lg:col-span-3 space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-1 w-4 bg-primary-500 rounded-full"></span>
                    Transaction History
                  </h3>

                  <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    {modalLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-white mb-4"></div>
                        <span className="text-xs font-bold uppercase tracking-widest">Loading Records...</span>
                      </div>
                    ) : productTransactions.length > 0 ? (
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Effect</th>
                            <th className="px-6 py-4">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {productTransactions.map((t, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-slate-700">
                                  {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${t.type === 'produce' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`text-sm font-black ${t.type === 'produce' ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.type === 'produce' ? '+' : '-'}{t.quantity} <span className="text-[10px] opacity-60 uppercase">{t.unit || 'pcs'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs text-slate-400 italic line-clamp-1 truncate max-w-[150px]">
                                  {t.note || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transactions found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-8 py-5 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedProduct(null);
                  setProductTransactions([]);
                }}
                className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default Home;
