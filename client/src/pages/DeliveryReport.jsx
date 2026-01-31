import React, { useState, useEffect, useMemo } from 'react';
import { getChallans } from '../services/api';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';

function DeliveryReport() {
    const [challans, setChallans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'detailed'
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [filters, setFilters] = useState({
        startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        transportSearch: '',
        vehicleSearch: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getChallans();
            setChallans(res.data.data || res.data);
        } catch (err) {
            console.error('Error loading challans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const analytics = useMemo(() => {
        const start = startOfDay(new Date(filters.startDate));
        const end = endOfDay(new Date(filters.endDate));

        const filtered = challans.filter(c => {
            const challanDate = new Date(c.date);
            const inDateRange = isWithinInterval(challanDate, { start, end });
            if (!inDateRange) return false;

            const tName = c.transport?.toLowerCase() || '';
            const vNum = c.vehicleNumber?.toLowerCase() || '';
            const searchTerm = filters.transportSearch.toLowerCase();

            if (searchTerm && !tName.includes(searchTerm) && !vNum.includes(searchTerm)) return false;

            return true;
        });

        // Stats calculation
        const uniqueVehicles = new Set();
        const uniqueTransports = new Set();
        const groups = {};
        const allTrips = [];

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(c => {
            const tName = (c.transport || 'Unknown Transport').trim();
            const vNum = (c.vehicleNumber || 'N/A').trim();
            const dest = (c.destination || 'N/A').trim();

            const itemSummary = c.items?.map(i => `${i.productName} (${i.quantityInPcs || i.quantity || 0} pcs)`).join(', ') || 'No Items';

            const tripData = {
                date: c.date,
                transport: tName,
                vehicle: vNum,
                destination: dest,
                items: c.items || [],
                itemSummary: itemSummary,
                challanNumber: c.challanNumber
            };

            allTrips.push(tripData);
            uniqueVehicles.add(vNum);
            uniqueTransports.add(tName);

            if (!groups[tName]) {
                groups[tName] = {
                    name: tName,
                    vehicles: {},
                    totalTrips: 0
                };
            }

            if (!groups[tName].vehicles[vNum]) {
                groups[tName].vehicles[vNum] = {
                    transportName: tName,
                    number: vNum,
                    tripsCount: 0,
                    destinations: {},
                    history: [],
                    lastDate: c.date
                };
            }

            groups[tName].totalTrips += 1;
            groups[tName].vehicles[vNum].tripsCount += 1;
            groups[tName].vehicles[vNum].history.push(tripData);
            groups[tName].vehicles[vNum].destinations[dest] = (groups[tName].vehicles[vNum].destinations[dest] || 0) + 1;

            if (new Date(c.date) > new Date(groups[tName].vehicles[vNum].lastDate)) {
                groups[tName].vehicles[vNum].lastDate = c.date;
            }
        });

        return {
            totalTrips: filtered.length,
            activeTransports: uniqueTransports.size,
            activeVehicles: uniqueVehicles.size,
            groups: Object.values(groups).sort((a, b) => b.totalTrips - a.totalTrips),
            allTrips
        };
    }, [challans, filters]);

    const downloadSummaryPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        try {
            doc.addImage(logo, 'PNG', 15, 10, 40, 30);
        } catch (e) { }

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 120, 215);
        doc.text('LOGISTICS SUMMARY REPORT', pageWidth / 2 + 20, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, pageWidth / 2 + 20, 32, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2 + 20, 37, { align: 'center' });

        // Stats Summary Table
        autoTable(doc, {
            startY: 45,
            head: [['Metric', 'Value']],
            body: [
                ['Total Trips Compeleted', analytics.totalTrips.toString()],
                ['Active Transports Engaged', analytics.activeTransports.toString()],
                ['Total Unique Vehicles', analytics.activeVehicles.toString()]
            ],
            theme: 'striped',
            headStyles: { fillColor: [0, 120, 215] },
            margin: { left: 15 }
        });

        const tableData = [];
        analytics.groups.forEach(transport => {
            Object.values(transport.vehicles).forEach(vehicle => {
                const destinations = Object.entries(vehicle.destinations)
                    .map(([d, c]) => `${d} (x${c})`)
                    .join(', ');

                tableData.push([
                    transport.name,
                    vehicle.number,
                    vehicle.tripsCount.toString(),
                    destinations,
                    format(new Date(vehicle.lastDate), 'dd-MM-yyyy')
                ]);
            });
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Transport Name', 'Vehicle No.', 'Total Trips', 'Destinations Breakdown', 'Last Trip']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [0, 173, 186] },
            styles: { fontSize: 8 },
            columnStyles: { 3: { cellWidth: 80 } }
        });

        doc.save(`welltouch-delivery-summary-${filters.startDate}.pdf`);
    };

    const downloadDetailedPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        try {
            doc.addImage(logo, 'PNG', 15, 10, 40, 30);
        } catch (e) { }

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 120, 215);
        doc.text('LOGISTICS DELIVERY DETAILS', pageWidth / 2 + 20, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, pageWidth / 2 + 20, 32, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2 + 20, 37, { align: 'center' });

        let finalY = 45;

        analytics.groups.forEach((transport) => {
            // Transport Header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 120, 215);
            doc.text(`${transport.name.toUpperCase()}`, 15, finalY);
            finalY += 6;

            Object.values(transport.vehicles).forEach((vehicle) => {
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                // Vehicle Sub-header
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(50, 50, 50);
                doc.text(`Vehicle: ${vehicle.number} (${vehicle.tripsCount} Trips)`, 15, finalY);
                finalY += 4;

                const tableData = vehicle.history
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(t => [
                        format(new Date(t.date), 'dd-MM-yyyy'),
                        t.destination,
                        t.challanNumber || '-'
                    ]);

                autoTable(doc, {
                    startY: finalY,
                    head: [['Date', 'Destination', 'Challan Number']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [0, 173, 186], fontSize: 9 },
                    styles: { fontSize: 8 },
                    margin: { left: 15, right: 15 }
                });

                finalY = doc.lastAutoTable.finalY + 12;
            });
            finalY += 5;
        });

        doc.save(`welltouch-delivery-details-${filters.startDate}.pdf`);
    };



    return (
        <div className="container mx-auto px-4 py-8 max-w-[1400px] min-h-screen">
            {/* Modal for Vehicle History */}
            {selectedVehicle && (
                <div className="fixed inset-0 bg-sky-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-8 border-b border-sky-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-sky-900">{selectedVehicle.number}</h3>
                                <p className="text-sky-400 text-xs font-bold uppercase tracking-widest">{selectedVehicle.transportName}</p>
                            </div>
                            <button
                                onClick={() => setSelectedVehicle(null)}
                                className="h-12 w-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-8 space-y-6">
                            {selectedVehicle.history.map((trip, idx) => (
                                <div key={idx} className="bg-sky-50/50 rounded-3xl border border-sky-100 overflow-hidden">
                                    <div className="bg-sky-100/50 px-8 py-6 flex justify-between items-center">
                                        <div className="flex items-center gap-6">
                                            <span className="bg-white px-4 py-2 rounded-xl border border-sky-200 text-sky-900 font-black text-sm shadow-sm">
                                                {format(new Date(trip.date), 'dd MMM yyyy')}
                                            </span>
                                            <span className="text-xl text-sky-900 font-black tracking-tight">{trip.destination}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Challan Number</span>
                                            <span className="text-sky-600 font-black text-sm bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                                                {trip.challanNumber}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                <div className="flex items-center gap-5">
                    <div className="bg-white p-3 rounded-2xl border border-sky-100 shadow-sm">
                        <img src={logo} alt="Welltouch" className="h-12 w-auto object-contain" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-sky-900 tracking-tight">Logistics Dashboard</h1>
                        <p className="text-sky-500 font-bold uppercase tracking-widest text-[10px] mt-1">Fleet Performance & Analytics</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setViewMode(v => v === 'summary' ? 'detailed' : 'summary')}
                        className="bg-white border-2 border-sky-100 text-sky-600 font-black py-4 px-8 rounded-2xl shadow-sm hover:border-sky-300 transition-all flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        {viewMode === 'summary' ? 'VIEW ALL DELIVERIES' : 'VIEW VEHICLE SUMMARY'}
                    </button>
                    <button
                        onClick={downloadSummaryPDF}
                        className="bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 font-black py-4 px-6 rounded-2xl transition-all flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 012-2zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0 0H7a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2z" /></svg>
                        DOWNLOAD SUMMARY
                    </button>
                    <button
                        onClick={downloadDetailedPDF}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        DOWNLOAD DETAILS
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Trips</p>
                        <h3 className="text-3xl font-black text-sky-900 leading-none">{analytics.totalTrips}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Transports</p>
                        <h3 className="text-3xl font-black text-sky-900 leading-none">{analytics.activeTransports}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mb-1">Unique Vehicles</p>
                        <h3 className="text-3xl font-black text-sky-900 leading-none">{analytics.activeVehicles}</h3>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-sky-100 p-8 mb-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Period From</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full bg-sky-50/50 border border-sky-100 rounded-2xl py-4 px-5 text-sky-900 font-bold outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Period To</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="w-full bg-sky-50/50 border border-sky-100 rounded-2xl py-4 px-5 text-sky-900 font-bold outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Search Fleet</label>
                        <input
                            type="text"
                            name="transportSearch"
                            placeholder="Filter by Transport or Vehicle..."
                            value={filters.transportSearch}
                            onChange={handleFilterChange}
                            className="w-full bg-sky-50/50 border border-sky-100 rounded-2xl py-4 px-5 text-sky-900 font-bold outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            {
                loading ? (
                    <div className="py-40 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-sky-100 border-t-sky-500 mx-auto"></div>
                    </div>
                ) : viewMode === 'summary' ? (
                    <div className="space-y-16">
                        {analytics.groups.map((transport, tIdx) => (
                            <div key={tIdx}>
                                <div className="flex items-center gap-6 mb-8 px-4">
                                    <h2 className="text-2xl font-black text-sky-900 uppercase tracking-tight">{transport.name}</h2>
                                    <div className="h-px bg-sky-100 flex-grow"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {Object.values(transport.vehicles).map((vehicle, vIdx) => (
                                        <div key={vIdx} className="bg-white rounded-[2.5rem] border border-sky-100 p-8 shadow-sm hover:shadow-xl transition-all group">
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sky-400 text-[10px] font-black uppercase mb-1">Vehicle No.</p>
                                                        <h3 className="text-2xl font-black text-sky-900">{vehicle.number}</h3>
                                                    </div>
                                                    <div className="bg-sky-50 text-sky-600 h-12 w-12 rounded-2xl flex items-center justify-center font-black">
                                                        {vehicle.tripsCount}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-sky-400 text-[8px] font-black uppercase tracking-widest">Main Destinations</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(vehicle.destinations).slice(0, 3).map(([d, c], i) => (
                                                            <span key={i} className="text-[10px] font-bold bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-100">
                                                                {d} ({c})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setSelectedVehicle(vehicle)}
                                                    className="w-full bg-sky-50 text-sky-600 font-black py-4 rounded-2xl hover:bg-sky-600 hover:text-white transition-all uppercase text-[10px] tracking-widest"
                                                >
                                                    View Trip History
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] border border-sky-100 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead className="bg-sky-50 border-b border-sky-100">
                                <tr>
                                    <th className="p-6 text-left text-[10px] font-black text-sky-900 uppercase tracking-widest">Date</th>
                                    <th className="p-6 text-left text-[10px] font-black text-sky-900 uppercase tracking-widest">Transport</th>
                                    <th className="p-6 text-left text-[10px] font-black text-sky-900 uppercase tracking-widest">Vehicle</th>
                                    <th className="p-6 text-left text-[10px] font-black text-sky-900 uppercase tracking-widest">Destination</th>
                                    <th className="p-6 text-left text-[10px] font-black text-sky-900 uppercase tracking-widest">Challan No.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sky-50">
                                {analytics.allTrips.map((trip, idx) => (
                                    <tr key={idx} className="hover:bg-sky-50/30 transition-colors">
                                        <td className="p-6">
                                            <span className="bg-sky-100 text-sky-900 font-black px-3 py-1 rounded-lg text-xs">
                                                {format(new Date(trip.date), 'dd-MM-yyyy')}
                                            </span>
                                        </td>
                                        <td className="p-6 text-sky-900 font-bold">{trip.transport}</td>
                                        <td className="p-6 text-sky-900 font-bold">{trip.vehicle}</td>
                                        <td className="p-6 text-sky-900 font-bold italic">{trip.destination}</td>
                                        <td className="p-6">
                                            <span className="text-[11px] font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                                                {trip.challanNumber}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            <div className="mt-24 py-12 border-t border-sky-100 flex flex-col items-center gap-4">
                <img src={logo} alt="" className="h-8 grayscale opacity-20" />
                <p className="text-[10px] font-black text-sky-900/20 uppercase tracking-[0.3em]">Welltouch Fleet Analytics System</p>
            </div>
        </div >
    );
}

export default DeliveryReport;
