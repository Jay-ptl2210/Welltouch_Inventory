import React, { useState, useEffect } from 'react';
import { getDashboard } from '../services/api';

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
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    size: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
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
    return true;
  });

  useEffect(() => {
    loadDashboard();
  }, []);

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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Inventory Dashboard</h2>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <p className="text-gray-600">Current stock levels for all products</p>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder="Filter by Name"
                className="w-full md:w-48 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="relative">
              <select
                name="size"
                value={filters.size}
                onChange={handleFilterChange}
                className="w-full md:w-48 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="">All Sizes</option>
                {/* Dynamically populate sizes based on available data if needed, or keeping it text input as requested/implied simpler first step or unique sizes from data */}
                {[...new Set(dashboardData.map(item => item.size))].filter(Boolean).sort().map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredDashboardData.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {dashboardData.length === 0
                ? 'Get started by adding a new product.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDashboardData.map((item, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow border border-primary-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 truncate" title={item.name}>{item.name}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Size:</span>
                    <span className="text-sm font-medium text-gray-800">{item.size}</span>
                  </div>
                  <div className="flex flex-col space-y-1 pt-2 border-t border-primary-200">
                    {(() => {
                      const counts = toCounts(item);
                      if (counts.hasRatios) {
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Linear / Packets / Pcs:</span>
                              <span className="text-sm font-bold text-primary-700">
                                {counts.linears.toFixed(2)} / {counts.packets.toFixed(2)} / {counts.pcs.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-600">
                              <span>Packets/Linear:</span>
                              <span className="font-medium text-gray-800">{item.packetsPerLinear}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-600">
                              <span>Pcs/Packet:</span>
                              <span className="font-medium text-gray-800">{item.pcsPerPacket}</span>
                            </div>
                          </>
                        );
                      }

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Pcs:</span>
                            <span className="text-sm font-bold text-primary-700">
                              {counts.pcs.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-red-600 mt-1">Add packets/linear and pcs/packet to view conversions.</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
