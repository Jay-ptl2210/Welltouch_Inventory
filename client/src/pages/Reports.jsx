import React, { useState, useEffect } from 'react';
import { getProducts, getTransactions } from '../services/api';
import { format } from 'date-fns';
import { fromPcs } from '../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Reports() {
    const [products, setProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        productName: '',
        size: '',
        startDate: '',
        endDate: ''
    });
    const [reportData, setReportData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [productsRes, transactionsRes] = await Promise.all([
                getProducts(),
                getTransactions()
            ]);
            setProducts(productsRes.data);
            setTransactions(transactionsRes.data);
        } catch (error) {
            console.error('Failed to load data for reports', error);
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
    };

    useEffect(() => {
        if (loading) return;

        const filteredTx = transactions.filter(tx => {
            if (filters.startDate) {
                const txDate = new Date(tx.date).toISOString().split('T')[0];
                if (txDate < filters.startDate) return false;
            }
            if (filters.endDate) {
                const txDate = new Date(tx.date).toISOString().split('T')[0];
                if (txDate > filters.endDate) return false;
            }
            if (filters.productName && tx.productName !== filters.productName) return false;
            if (filters.size && tx.size !== filters.size) return false;
            return true;
        });

        const aggregation = {};

        filteredTx.forEach(tx => {
            const key = `${tx.productName}|${tx.size}`;
            if (!aggregation[key]) {
                aggregation[key] = {
                    name: tx.productName,
                    size: tx.size,
                    producedPcs: 0,
                    deliveredPcs: 0,
                    productId: tx.productId
                };
            }

            const product = products.find(p => p.name === tx.productName && p.size === tx.size);
            if (!product) return;

            let qtyInPcs = 0;
            try {
                const packetsPerLinear = Number(product.packetsPerLinear) || 0;
                const pcsPerPacket = Number(product.pcsPerPacket) || 0;
                const q = Number(tx.quantity);

                if (tx.unit === 'linear') qtyInPcs = q * packetsPerLinear * pcsPerPacket;
                else if (tx.unit === 'packet') qtyInPcs = q * pcsPerPacket;
                else qtyInPcs = q; // pcs
            } catch (e) {
                console.error('Conversion error', e);
                qtyInPcs = 0;
            }

            if (tx.type === 'produce') {
                aggregation[key].producedPcs += qtyInPcs;
            } else if (tx.type === 'delivered') {
                aggregation[key].deliveredPcs += qtyInPcs;
            }
        });

        const report = Object.values(aggregation).map(item => {
            const product = products.find(p => p.name === item.name && p.size === item.size);
            if (!product) return item;

            return {
                ...item,
                produced: {
                    pcs: item.producedPcs,
                    packets: fromPcs(item.producedPcs, 'packet', product),
                    linear: fromPcs(item.producedPcs, 'linear', product)
                },
                delivered: {
                    pcs: item.deliveredPcs,
                    packets: fromPcs(item.deliveredPcs, 'packet', product),
                    linear: fromPcs(item.deliveredPcs, 'linear', product)
                }
            };
        });

        setReportData(report);

    }, [transactions, products, filters]);

    const downloadPDF = () => {
        if (reportData.length === 0) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const dateStr = format(new Date(), 'dd-MM-yyyy');

        // Title Section
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('Inventory Report', margin, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${dateStr}`, margin, 32);

        let periodStr = 'Period: All Time';
        if (filters.startDate || filters.endDate) {
            periodStr = 'Period: ';
            if (filters.startDate) periodStr += `From ${filters.startDate} `;
            if (filters.endDate) periodStr += `To ${filters.endDate}`;
        }
        doc.text(periodStr, margin, 38);

        // Card Layout Settings
        const startY = 48;
        const cardGap = 10;
        const colCount = 3;
        const cardWidth = (pageWidth - (margin * 2) - (cardGap * (colCount - 1))) / colCount;
        const cardHeight = 75; // Increased height to fit all details

        let currentX = margin;
        let currentY = startY;

        reportData.forEach((item, index) => {
            // Check for page break
            if (currentY + cardHeight > pageHeight - margin) {
                doc.addPage();
                currentY = margin;
            }

            // --- Draw Card Container ---
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, 'FD');

            // --- Header (Product Name & Size) ---
            // Header Background
            doc.setFillColor(248, 250, 252); // Light gray bg
            doc.rect(currentX + 0.5, currentY + 0.5, cardWidth - 1, 14, 'F');

            // Product Name
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.setFont(undefined, 'bold');

            // Truncate name if too long
            let displayName = item.name;
            if (displayName.length > 20) displayName = displayName.substring(0, 18) + '...';
            doc.text(displayName, currentX + 4, currentY + 9);

            // Size Badge
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.setFont(undefined, 'normal');
            const sizeText = item.size;
            const sizeWidth = doc.getTextWidth(sizeText) + 4;
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(255, 255, 255);
            // Align to right of header
            const sizeX = currentX + cardWidth - sizeWidth - 2;
            doc.roundedRect(sizeX, currentY + 3, sizeWidth, 8, 2, 2, 'FD');
            doc.text(sizeText, sizeX + 2, currentY + 8);

            // --- Content Section Offset ---
            let contentY = currentY + 22;

            // --- PRODUCED Section ---
            doc.setFontSize(9);
            doc.setTextColor(22, 163, 74); // Green-600
            doc.setFont(undefined, 'bold');
            doc.text('PRODUCED', currentX + 4, contentY);

            // Draw underline
            doc.setDrawColor(220, 252, 231); // Green-100
            doc.setLineWidth(0.5);
            doc.line(currentX + 4, contentY + 1, currentX + 22, contentY + 1);

            contentY += 6;
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(21, 128, 61); // Green-700

            // Grid for details
            const colW = (cardWidth - 8) / 3;

            // Produced Values
            const pLinear = item.produced.linear.toFixed(1);
            const pPackets = item.produced.packets.toFixed(1);
            const pPcs = item.produced.pcs.toFixed(0);

            // Linear
            doc.setFillColor(240, 253, 244); // Green-50
            doc.roundedRect(currentX + 4, contentY, colW - 2, 14, 1, 1, 'F');
            doc.setFont(undefined, 'bold');
            doc.text(pLinear, currentX + 4 + (colW - 2) / 2, contentY + 5, { align: 'center' });
            doc.setFont(undefined, 'normal');
            doc.setFontSize(7);
            doc.text('Linear', currentX + 4 + (colW - 2) / 2, contentY + 11, { align: 'center' });

            // Packets
            doc.setFillColor(240, 253, 244); // Reset Fill Color
            doc.roundedRect(currentX + 4 + colW, contentY, colW - 2, 14, 1, 1, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text(pPackets, currentX + 4 + colW + (colW - 2) / 2, contentY + 5, { align: 'center' });
            doc.setFont(undefined, 'normal');
            doc.setFontSize(7);
            doc.text('Packets', currentX + 4 + colW + (colW - 2) / 2, contentY + 11, { align: 'center' });

            // Pcs
            doc.setFillColor(240, 253, 244); // Reset Fill Color
            doc.roundedRect(currentX + 4 + colW * 2, contentY, colW - 2, 14, 1, 1, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text(pPcs, currentX + 4 + colW * 2 + (colW - 2) / 2, contentY + 5, { align: 'center' });
            doc.setFont(undefined, 'normal');
            doc.setFontSize(7);
            doc.text('Pcs', currentX + 4 + colW * 2 + (colW - 2) / 2, contentY + 11, { align: 'center' });


            // --- DELIVERED Section ---
            contentY += 20;

            doc.setFontSize(9);
            doc.setTextColor(220, 38, 38); // Red-600
            doc.setFont(undefined, 'bold');
            doc.text('DELIVERED', currentX + 4, contentY);

            // Draw underline
            doc.setDrawColor(254, 226, 226); // Red-100
            doc.line(currentX + 4, contentY + 1, currentX + 22, contentY + 1);

            contentY += 6;
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(185, 28, 28); // Red-700

            // Delivered Values
            const dLinear = item.delivered.linear.toFixed(1);
            const dPackets = item.delivered.packets.toFixed(1);
            const dPcs = item.delivered.pcs.toFixed(0);

            // Linear
            doc.setFillColor(254, 242, 242); // Red-50
            doc.roundedRect(currentX + 4, contentY, colW - 2, 14, 1, 1, 'F');
            doc.setFont(undefined, 'bold');
            doc.text(dLinear, currentX + 4 + (colW - 2) / 2, contentY + 5, { align: 'center' });
            doc.setFont(undefined, 'normal');
            doc.setFontSize(7);
            doc.text('Linear', currentX + 4 + (colW - 2) / 2, contentY + 11, { align: 'center' });

            // Packets
            doc.setFillColor(254, 242, 242); // Reset Fill Color
            doc.roundedRect(currentX + 4 + colW, contentY, colW - 2, 14, 1, 1, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text(dPackets, currentX + 4 + colW + (colW - 2) / 2, contentY + 5, { align: 'center' });
            doc.setFont(undefined, 'normal');
            doc.setFontSize(7);
            doc.text('Packets', currentX + 4 + colW + (colW - 2) / 2, contentY + 11, { align: 'center' });

            // Pcs
            doc.setFillColor(254, 242, 242); // Reset Fill Color
            doc.roundedRect(currentX + 4 + colW * 2, contentY, colW - 2, 14, 1, 1, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text(dPcs, currentX + 4 + colW * 2 + (colW - 2) / 2, contentY + 5, { align: 'center' });
            doc.setFont(undefined, 'normal');
            doc.setFontSize(7);
            doc.text('Pcs', currentX + 4 + colW * 2 + (colW - 2) / 2, contentY + 11, { align: 'center' });


            // Update layout position
            if ((index + 1) % colCount === 0) {
                currentX = margin;
                currentY += cardHeight + cardGap;
            } else {
                currentX += cardWidth + cardGap;
            }
        });

        doc.save(`inventory_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const uniqueProductNames = [...new Set(products.map(p => p.name))];
    const uniqueSizes = [...new Set(products.map(p => p.size))];

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Reports</h2>
                        <p className="text-gray-600">Overview of production vs delivery</p>
                    </div>
                    <button
                        onClick={downloadPDF}
                        disabled={reportData.length === 0}
                        className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product</label>
                        <select
                            name="productName"
                            value={filters.productName}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                            <option value="">All Products</option>
                            {uniqueProductNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Size</label>
                        <select
                            name="size"
                            value={filters.size}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                            <option value="">All Sizes</option>
                            {uniqueSizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">From Date</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">To Date</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                {/* Report Grid */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="text-center py-24">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-gray-500">No data found for the selected filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reportData.map((item, idx) => (
                            <div key={idx} className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 truncate" title={item.name}>{item.name}</h3>
                                    <span className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-semibold text-gray-600">
                                        {item.size}
                                    </span>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Produced */}
                                    <div>
                                        <div className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Produced
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                            <div className="bg-green-50 rounded p-1">
                                                <div className="font-bold text-green-700">{item.produced.linear.toFixed(1)}</div>
                                                <div className="text-[10px] text-green-600">Linear</div>
                                            </div>
                                            <div className="bg-green-50 rounded p-1">
                                                <div className="font-bold text-green-700">{item.produced.packets.toFixed(1)}</div>
                                                <div className="text-[10px] text-green-600">Packets</div>
                                            </div>
                                            <div className="bg-green-50 rounded p-1">
                                                <div className="font-bold text-green-700">{item.produced.pcs.toFixed(0)}</div>
                                                <div className="text-[10px] text-green-600">Pcs</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivered */}
                                    <div>
                                        <div className="text-xs font-bold text-red-600 uppercase mb-1 flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                            Delivered
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                            <div className="bg-red-50 rounded p-1">
                                                <div className="font-bold text-red-700">{item.delivered.linear.toFixed(1)}</div>
                                                <div className="text-[10px] text-red-600">Linear</div>
                                            </div>
                                            <div className="bg-red-50 rounded p-1">
                                                <div className="font-bold text-red-700">{item.delivered.packets.toFixed(1)}</div>
                                                <div className="text-[10px] text-red-600">Packets</div>
                                            </div>
                                            <div className="bg-red-50 rounded p-1">
                                                <div className="font-bold text-red-700">{item.delivered.pcs.toFixed(0)}</div>
                                                <div className="text-[10px] text-red-600">Pcs</div>
                                            </div>
                                        </div>
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

export default Reports;
