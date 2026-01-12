import React, { useState, useEffect } from 'react';
import { getDashboard, getParties } from '../services/api';
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
    party: ''
  });
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              placeholder="Search by name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Size</label>
            <select
              name="size"
              value={filters.size}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">All Types</option>
              {['PPF TF', 'PPF ST', 'Cotton TF', 'Cotton ST', 'Ultra'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Party</label>
            <select
              name="party"
              value={filters.party}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">All Parties</option>
              {parties.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
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
              <button className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center group/btn">
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
    </div>
  );
}

export default Home;
