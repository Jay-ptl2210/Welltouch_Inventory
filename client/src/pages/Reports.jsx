import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, getTransactions, getParties } from '../services/api';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';

function Reports() {
    const [products, setProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        name: '',
        size: '',
        type: '',
        party: '',
        weight: '',
        transactionType: '' // produce or delivered
    });
    const [parties, setParties] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pRes, tRes, partiesRes] = await Promise.all([
                getProducts(),
                getTransactions(),
                getParties()
            ]);
            setProducts(pRes.data);
            setTransactions(tRes.data);
            setParties(partiesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setCurrentPage(1);
    };

    const uniqueSizes = useMemo(() => [...new Set(products.map(p => p.size))], [products]);

    useEffect(() => {
        if (!products.length) return;

        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);

        const report = products
            .filter(p => {
                if (filters.name && !p.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
                if (filters.size && p.size !== filters.size) return false;
                if (filters.type && p.type !== filters.type) return false;
                if (filters.party && (p.party?._id || p.party) !== filters.party) return false;
                if (filters.weight && String(p.weight) !== filters.weight) return false;
                return true;
            })
            .map(product => {
                const productTransactions = transactions.filter(t => t.product?._id === product._id || t.product === product._id);

                const beforeRange = productTransactions.filter(t => new Date(t.date) < start);
                const inRange = productTransactions.filter(t => {
                    const d = new Date(t.date);
                    return d >= start && d <= end;
                });

                const calculatePcs = (txs) => txs.reduce((acc, t) => {
                    const q = Number(t.quantityInPcs) || 0;
                    return t.type === 'produce' ? acc + q : acc - q;
                }, 0);

                const initialPcs = (Number(product.previousStock) || 0) + calculatePcs(beforeRange);

                const producedPcs = inRange
                    .filter(t => t.type === 'produce' && (!filters.transactionType || filters.transactionType === 'produce'))
                    .reduce((acc, t) => acc + (Number(t.quantityInPcs) || 0), 0);

                const deliveredPcs = inRange
                    .filter(t => t.type === 'delivered' && (!filters.transactionType || filters.transactionType === 'delivered'))
                    .reduce((acc, t) => acc + (Number(t.quantityInPcs) || 0), 0);

                const remainingPcs = initialPcs + producedPcs - deliveredPcs;


                const toUnit = (pcs) => {
                    const l = product.packetsPerLinear > 0 && product.pcsPerPacket > 0 ? pcs / (product.packetsPerLinear * product.pcsPerPacket) : 0;
                    const pk = product.pcsPerPacket > 0 ? pcs / product.pcsPerPacket : 0;
                    return { pcs, linear: l, packets: pk };
                };

                return {
                    product,
                    initial: toUnit(initialPcs),
                    produced: toUnit(producedPcs),
                    delivered: toUnit(deliveredPcs),
                    remaining: toUnit(remainingPcs)
                };
            });

        setReportData(report.filter(r => r.initial.pcs !== 0 || r.produced.pcs !== 0 || r.delivered.pcs !== 0 || r.remaining.pcs !== 0));
        setCurrentPage(1);
    }, [transactions, products, filters, loading]);

    const totals = useMemo(() => {
        return reportData.reduce((acc, item) => ({
            initial: {
                linear: acc.initial.linear + item.initial.linear,
                packets: acc.initial.packets + item.initial.packets,
                pcs: acc.initial.pcs + item.initial.pcs
            },
            produced: {
                linear: acc.produced.linear + item.produced.linear,
                packets: acc.produced.packets + item.produced.packets,
                pcs: acc.produced.pcs + item.produced.pcs
            },
            delivered: {
                linear: acc.delivered.linear + item.delivered.linear,
                packets: acc.delivered.packets + item.delivered.packets,
                pcs: acc.delivered.pcs + item.delivered.pcs
            },
            remaining: {
                linear: acc.remaining.linear + item.remaining.linear,
                packets: acc.remaining.packets + item.remaining.packets,
                pcs: acc.remaining.pcs + item.remaining.pcs
            }
        }), {
            initial: { linear: 0, packets: 0, pcs: 0 },
            produced: { linear: 0, packets: 0, pcs: 0 },
            delivered: { linear: 0, packets: 0, pcs: 0 },
            remaining: { linear: 0, packets: 0, pcs: 0 }
        });
    }, [reportData]);


    const totalItems = reportData.length;
    const paginatedReportData = reportData.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const downloadPDF = () => {
        if (reportData.length === 0) return;

        const doc = new jsPDF({ orientation: 'landscape' });

        // Add Logo - Repositioned to Right Side
        try {
            const pageWidth = doc.internal.pageSize.getWidth();
            const logoWidth = 40;
            doc.addImage(logo, 'PNG', pageWidth - logoWidth - 14, 10, logoWidth, 12);
        } catch (e) {
            console.error('Error adding logo to PDF:', e);
        }


        doc.setFontSize(22);

        doc.setTextColor(40);
        doc.text('Detailed Inventory Report', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 33);

        const tableData = reportData.map(item => [
            item.product.name,
            item.product.type || 'N/A',
            item.product.size,
            (item.product.weight || 0) + 'gm',
            item.product.party?.name || 'N/A',
            // Opening
            item.initial.linear.toFixed(1),
            item.initial.packets.toFixed(1),
            item.initial.pcs.toFixed(0),
            // Produced
            item.produced.linear.toFixed(1),
            item.produced.packets.toFixed(1),
            item.produced.pcs.toFixed(0),
            // Delivered
            item.delivered.linear.toFixed(1),
            item.delivered.packets.toFixed(1),
            item.delivered.pcs.toFixed(0),
            // Remaining
            item.remaining.linear.toFixed(1),
            item.remaining.packets.toFixed(1),
            item.remaining.pcs.toFixed(0)
        ]);

        // Create totals row
        const totalsRow = [
            { content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            // Opening
            totals.initial.linear.toFixed(1),
            totals.initial.packets.toFixed(1),
            totals.initial.pcs.toFixed(0),
            // Produced
            totals.produced.linear.toFixed(1),
            totals.produced.packets.toFixed(1),
            totals.produced.pcs.toFixed(0),
            // Delivered
            totals.delivered.linear.toFixed(1),
            totals.delivered.packets.toFixed(1),
            totals.delivered.pcs.toFixed(0),
            // Remaining
            totals.remaining.linear.toFixed(1),
            totals.remaining.packets.toFixed(1),
            totals.remaining.pcs.toFixed(0)
        ];

        // Add Totals row to the START of tableData
        tableData.unshift(totalsRow);



        autoTable(doc, {
            startY: 40,
            head: [
                [
                    { content: 'Product Info', colSpan: 5, styles: { halign: 'center', fillColor: [51, 51, 51] } },
                    { content: 'Opening Stock', colSpan: 3, styles: { halign: 'center', fillColor: [63, 81, 181] } },
                    { content: 'Produced (+)', colSpan: 3, styles: { halign: 'center', fillColor: [76, 175, 80] } },
                    { content: 'Delivered (-)', colSpan: 3, styles: { halign: 'center', fillColor: [211, 63, 51] } },
                    { content: 'Closing Stock', colSpan: 3, styles: { halign: 'center', fillColor: [33, 150, 243] } }
                ],
                [
                    'Product', 'Type', 'Size', 'Weight', 'Party',
                    'Lin', 'Pkt', 'Pcs',
                    'Lin', 'Pkt', 'Pcs',
                    'Lin', 'Pkt', 'Pcs',
                    'Lin', 'Pkt', 'Pcs'
                ]
            ],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                valign: 'middle'
            },
            headStyles: {
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [255, 255, 255]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 'auto' },
                5: { fillColor: [248, 250, 252] },
                6: { fillColor: [248, 250, 252] },
                7: { fillColor: [248, 250, 252] },
                11: { fillColor: [248, 250, 252] },
                12: { fillColor: [248, 250, 252] },
                13: { fillColor: [248, 250, 252] }
            },
            didParseCell: function (data) {
                if (data.section === 'body' && (data.column.index >= 5)) {
                    data.cell.styles.halign = 'center';
                }
            }
        });

        doc.save(`welltouch-detailed-report-${filters.startDate}-to-${filters.endDate}.pdf`);
    };


    return (
        <div className="container mx-auto px-4 py-8 max-w-[1600px]">
            {/* Refined Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 px-2">
                <div className="flex items-center gap-4">
                    <img src={logo} alt="Welltouch" className="h-12 w-auto object-contain" />
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">Reports</h1>
                        <p className="text-gray-500 font-medium mt-1">Overview of production vs delivery</p>
                    </div>
                </div>

                <button
                    onClick={downloadPDF}
                    className="bg-[#D33F33] hover:bg-[#b0352b] text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2 group text-sm"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zM5 18h14v2H5v-2z" /></svg>
                    Download PDF
                </button>
            </div>

            {/* Redesigned Filter Bar (Single Row) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-10 p-4 px-6">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Party</label>
                        <div className="relative">
                            <select name="party" value={filters.party} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1.5 focus:border-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">All Parties</option>
                                {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Product</label>
                        <div className="relative">
                            <select name="name" value={filters.name} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1.5 focus:border-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">All Products</option>
                                {[...new Set(products.map(p => p.name))].sort().map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Size</label>
                        <div className="relative">
                            <select name="size" value={filters.size} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1.5 focus:border-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">All Sizes</option>
                                {[...new Set(products.map(p => p.size))].filter(Boolean).sort().map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Type</label>
                        <div className="relative">
                            <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1.5 focus:border-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">All Types</option>
                                {[...new Set(products.map(p => p.type))].filter(Boolean).sort().map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Weight</label>
                        <div className="relative">
                            <select name="weight" value={filters.weight} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1.5 focus:border-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">All Weights</option>
                                {[...new Set(products.map(p => p.weight))].filter(w => w !== undefined).sort((a, b) => a - b).map(w => (
                                    <option key={w} value={w}>{w}gm</option>
                                ))}
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tx Type</label>
                        <div className="relative">
                            <select name="transactionType" value={filters.transactionType} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1.5 focus:border-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">All Types</option>
                                <option value="produce">Produced</option>
                                <option value="delivered">Delivered</option>
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">From Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1 focus:border-indigo-500 outline-none font-bold text-sm" />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">To Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full bg-transparent border-0 border-b-2 border-gray-100 py-1 focus:border-indigo-500 outline-none font-bold text-sm" />
                    </div>
                </div>
            </div>

            {/* Matrix View - 3 Column Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-500 font-medium tracking-widest uppercase text-xs">Compiling Reports...</p>
                </div>
            ) : reportData.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No matching inventory records found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* TOTALS CARD (Moved to the top) */}
                    {reportData.length > 0 && (
                        <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden transform scale-[1.02] transition-transform">
                            {/* Card Header */}
                            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-700 bg-slate-900/50">
                                <h3 className="text-base font-black text-white uppercase tracking-widest">GRAND TOTALS</h3>
                                <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase">ALL PRODUCTS</span>
                            </div>

                            <div className="p-6 pt-5 space-y-6">
                                {/* PRODUCED TOTAL */}
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-green-400/90 uppercase tracking-wider">Total Produced</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-green-400/10 p-3 rounded-lg text-center border border-green-400/20">
                                            <div className="text-lg font-black text-green-400 leading-none">{totals.produced.linear.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-green-400/60 uppercase tracking-tighter mt-1.5">Linear</div>
                                        </div>
                                        <div className="bg-green-400/10 p-3 rounded-lg text-center border border-green-400/20">
                                            <div className="text-lg font-black text-green-400 leading-none">{totals.produced.packets.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-green-400/60 uppercase tracking-tighter mt-1.5">Packets</div>
                                        </div>
                                        <div className="bg-green-400/10 p-3 rounded-lg text-center border border-green-400/20">
                                            <div className="text-lg font-black text-green-400 leading-none">{totals.produced.pcs.toFixed(0)}</div>
                                            <div className="text-[10px] font-bold text-green-400/60 uppercase tracking-tighter mt-1.5">Pcs</div>
                                        </div>
                                    </div>
                                </div>

                                {/* DELIVERED TOTAL */}
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-red-400/90 uppercase tracking-wider">Total Delivered</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-red-400/10 p-3 rounded-lg text-center border border-red-400/20">
                                            <div className="text-lg font-black text-red-400 leading-none">{totals.delivered.linear.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-red-400/60 uppercase tracking-tighter mt-1.5">Linear</div>
                                        </div>
                                        <div className="bg-red-400/10 p-3 rounded-lg text-center border border-red-400/20">
                                            <div className="text-lg font-black text-red-400 leading-none">{totals.delivered.packets.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-red-400/60 uppercase tracking-tighter mt-1.5">Packets</div>
                                        </div>
                                        <div className="bg-red-400/10 p-3 rounded-lg text-center border border-red-400/20">
                                            <div className="text-lg font-black text-red-400 leading-none">{totals.delivered.pcs.toFixed(0)}</div>
                                            <div className="text-[10px] font-bold text-red-400/60 uppercase tracking-tighter mt-1.5">Pcs</div>
                                        </div>
                                    </div>
                                </div>

                                {/* REMAINING TOTAL */}
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-indigo-400/90 uppercase tracking-wider">Total Remaining</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-indigo-400/10 p-3 rounded-lg text-center border border-indigo-400/20">
                                            <div className="text-lg font-black text-indigo-400 leading-none">{totals.remaining.linear.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-tighter mt-1.5">Linear</div>
                                        </div>
                                        <div className="bg-indigo-400/10 p-3 rounded-lg text-center border border-indigo-400/20">
                                            <div className="text-lg font-black text-indigo-400 leading-none">{totals.remaining.packets.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-tighter mt-1.5">Packets</div>
                                        </div>
                                        <div className="bg-indigo-400/10 p-3 rounded-lg text-center border border-indigo-400/20">
                                            <div className="text-lg font-black text-indigo-400 leading-none">{totals.remaining.pcs.toFixed(0)}</div>
                                            <div className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-tighter mt-1.5">Pcs</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {paginatedReportData.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">

                            {/* Card Header */}
                            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                                <h3 className="text-base font-bold text-gray-800 line-clamp-1">{item.product.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-700 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
                                        {item.product.type}
                                    </span>
                                    <span className="bg-white border text-gray-400 text-[10px] font-bold px-2 py-1 rounded-md uppercase border-gray-200">
                                        {item.product.size}
                                    </span>
                                    <span className="bg-white border text-gray-400 text-[10px] font-bold px-2 py-1 rounded-md uppercase border-gray-200">
                                        {item.product.weight || 0}gm
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 pt-5 space-y-6">
                                {/* OPENING SECTION */}
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-wider">Opening Stock</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-blue-50/40 p-3 rounded-lg text-center border border-blue-100/30">
                                            <div className="text-lg font-black text-blue-700 leading-none">{item.initial.linear.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-blue-600/60 uppercase tracking-tighter mt-1.5">Linear</div>
                                        </div>
                                        <div className="bg-blue-50/40 p-3 rounded-lg text-center border border-blue-100/30">
                                            <div className="text-lg font-black text-blue-700 leading-none">{item.initial.packets.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-blue-600/60 uppercase tracking-tighter mt-1.5">Packets</div>
                                        </div>
                                        <div className="bg-blue-50/40 p-3 rounded-lg text-center border border-blue-100/30">
                                            <div className="text-lg font-black text-blue-700 leading-none">{item.initial.pcs.toFixed(0)}</div>
                                            <div className="text-[10px] font-bold text-blue-600/60 uppercase tracking-tighter mt-1.5">Pcs</div>
                                        </div>
                                    </div>
                                </div>

                                {/* PRODUCED SECTION */}
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-green-600 uppercase tracking-wider before:content-['+']">Produced</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-green-50/40 p-3 rounded-lg text-center border border-green-100/30">
                                            <div className="text-lg font-black text-green-700 leading-none">{item.produced.linear.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-green-600/60 uppercase tracking-tighter mt-1.5">Linear</div>
                                        </div>
                                        <div className="bg-green-50/40 p-3 rounded-lg text-center border border-green-100/30">
                                            <div className="text-lg font-black text-green-700 leading-none">{item.produced.packets.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-green-600/60 uppercase tracking-tighter mt-1.5">Packets</div>
                                        </div>
                                        <div className="bg-green-50/40 p-3 rounded-lg text-center border border-green-100/30">
                                            <div className="text-lg font-black text-green-700 leading-none">{item.produced.pcs.toFixed(0)}</div>
                                            <div className="text-[10px] font-bold text-green-600/60 uppercase tracking-tighter mt-1.5">Pcs</div>
                                        </div>
                                    </div>
                                </div>

                                {/* DELIVERED SECTION */}
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-[#D33F33] uppercase tracking-wider before:content-['-']">Delivered</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-red-50/40 p-3 rounded-lg text-center border border-red-100/30">
                                            <div className="text-lg font-black text-[#D33F33] leading-none">{item.delivered.linear.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-red-500/60 uppercase tracking-tighter mt-1.5">Linear</div>
                                        </div>
                                        <div className="bg-red-50/40 p-3 rounded-lg text-center border border-red-100/30">
                                            <div className="text-lg font-black text-[#D33F33] leading-none">{item.delivered.packets.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-red-500/60 uppercase tracking-tighter mt-1.5">Packets</div>
                                        </div>
                                        <div className="bg-red-50/40 p-3 rounded-lg text-center border border-red-100/30">
                                            <div className="text-lg font-black text-[#D33F33] leading-none">{item.delivered.pcs.toFixed(0)}</div>
                                            <div className="text-[10px] font-bold text-red-500/60 uppercase tracking-tighter mt-1.5">Pcs</div>
                                        </div>
                                    </div>
                                </div>

                                {/* REMAINING SECTION */}
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-[11px] font-black text-indigo-600 uppercase tracking-wider before:content-['\f023'] before:font-serif">Remaining</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-indigo-50/40 p-3 rounded-lg text-center border border-indigo-100/30">
                                            <div className="text-lg font-black text-indigo-700 leading-none">{item.remaining.linear.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-indigo-500/60 uppercase tracking-tighter mt-1.5">Linear</div>
                                        </div>
                                        <div className="bg-indigo-50/40 p-3 rounded-lg text-center border border-indigo-100/30">
                                            <div className="text-lg font-black text-indigo-700 leading-none">{item.remaining.packets.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-indigo-500/60 uppercase tracking-tighter mt-1.5">Packets</div>
                                        </div>
                                        <div className="bg-indigo-50/40 p-3 rounded-lg text-center border border-indigo-100/30">
                                            <div className="text-lg font-black text-indigo-700 leading-none">{item.remaining.pcs.toFixed(0)}</div>
                                            <div className="text-[10px] font-bold text-indigo-500/60 uppercase tracking-tighter mt-1.5">Pcs</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>


            )}

            {!loading && reportData.length > 0 && (
                <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}

export default Reports;
