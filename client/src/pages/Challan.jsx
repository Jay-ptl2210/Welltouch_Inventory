import React, { useState, useEffect } from 'react';
import { getProducts, addTransaction, getParties, getCustomers, getChallans, saveChallan, updateChallan, deleteChallan, getTransports, deleteTransactionsByChallan } from '../services/api';
import { format } from 'date-fns';
import { toPcs } from '../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

function Challan() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [parties, setParties] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [challans, setChallans] = useState([]);
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;
    const [editingChallan, setEditingChallan] = useState(null);

    const isEditable = user?.role === 'super_user' || user?.permissions?.challan === 'edit';

    const [headerData, setHeaderData] = useState({
        customerId: '',
        address: '',
        shipName: '',
        shipAddress: '',
        transport: '',
        vehicleNumber: '',
        dispatchThrough: '',
        termsOfDelivery: '',
        destination: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [currentItem, setCurrentItem] = useState({
        partyId: '',
        productId: '',
        quantity: '',
        unit: 'linear',
        date: new Date().toISOString().split('T')[0]
    });

    const [items, setItems] = useState([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [productsRes, partiesRes, customersRes, challansRes, transportsRes] = await Promise.all([
                getProducts(),
                getParties(),
                getCustomers(),
                getChallans(),
                getTransports()
            ]);
            setProducts(productsRes.data);
            setTransports((transportsRes.data || []).sort((a, b) => a.name.localeCompare(b.name)));
            setParties((partiesRes.data || []).sort((a, b) => a.name.localeCompare(b.name)));

            // Include parties with isBoth=true in customers list
            const customersData = customersRes.data.data || customersRes.data;
            const bothParties = (partiesRes.data || []).filter(p => p.isBoth);
            setCustomers([...customersData, ...bothParties].sort((a, b) => a.name.localeCompare(b.name)));

            setChallans(challansRes.data.data || challansRes.data);
        } catch (err) {
            console.error('Error loading data:', err);
            setMessage({ type: 'error', text: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        setHeaderData(prev => ({ ...prev, [name]: value }));

        if (name === 'customerId') {
            const selectedCust = customers.find(c => c._id === value);
            if (selectedCust) {
                setHeaderData(prev => ({
                    ...prev,
                    address: selectedCust.address || '',
                    shipName: selectedCust.name || '',
                    shipAddress: selectedCust.address || ''
                }));
            }
        }

        if (name === 'transport') {
            const selectedTransport = transports.find(t => t.name === value);
            setHeaderData(prev => ({
                ...prev,
                vehicleNumber: selectedTransport?.vehicles?.[0] || ''
            }));
        }
    };

    const handleCurrentItemChange = (e) => {
        const { name, value } = e.target;
        setCurrentItem(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'partyId') {
                newState.productId = '';
            }
            return newState;
        });
    };

    const addItem = () => {
        const selectedProduct = products.find(p => p._id === currentItem.productId);

        if (!selectedProduct) {
            setMessage({ type: 'error', text: 'Please select a valid product' });
            return;
        }

        if (!currentItem.quantity || currentItem.quantity <= 0) {
            setMessage({ type: 'error', text: 'Enter a valid quantity' });
            return;
        }

        const qtyPcs = toPcs(currentItem.quantity, currentItem.unit, selectedProduct);

        // How much of this product was originally in the saved challan currently in DB?
        // We need this to "revert" the deduction in our local calculation
        const originalSavedPcs = (editingChallan?.items || [])
            .filter(item => (item.product?._id || item.product) === currentItem.productId)
            .reduce((sum, item) => sum + (item.quantityInPcs || 0), 0);

        // Calculate total quantity currently in the form items list for this product
        const alreadyAddedPcs = items
            .filter(item => item.productId === currentItem.productId)
            .reduce((sum, item) => sum + (item.qtyPcs || 0), 0);

        // Check against remaining available stock
        // Available = (Stock currently in DB) + (What this challan already took) - (What we've added to the list in this session)
        const availableStock = (selectedProduct.quantity || 0) + originalSavedPcs - alreadyAddedPcs;

        if (qtyPcs > availableStock) {
            const totalPool = (selectedProduct.quantity || 0) + originalSavedPcs;
            setMessage({ type: 'error', text: `Insufficient stock! Available: ${availableStock.toFixed(1)} pcs (${totalPool.toFixed(1)} total pool, ${alreadyAddedPcs.toFixed(1)} already in this list)` });
            return;
        }

        setItems([...items, {
            ...currentItem,
            productId: selectedProduct._id,
            qtyPcs,
            productName: selectedProduct.name,
            size: selectedProduct.size,
            productType: selectedProduct.type,
            productWeight: selectedProduct.weight,
            partyName: parties.find(pt => pt._id === currentItem.partyId)?.name
        }]);

        setCurrentItem(prev => ({
            ...prev,
            productId: '',
            quantity: '',
            unit: 'linear'
        }));
        setMessage({ type: '', text: '' });
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateAvailable = () => {
        const p = products.find(prod => prod._id === currentItem.productId);
        if (!p) return '-';

        // How much of this product was originally in the saved challan currently in DB?
        // We need this to "revert" the deduction in our local calculation
        const originalSavedPcs = (editingChallan?.items || [])
            .filter(item => (item.product?._id || item.product) === currentItem.productId)
            .reduce((sum, item) => sum + (item.quantityInPcs || 0), 0);

        // Calculate total quantity currently in the form items list for this product
        const alreadyInListPcs = items
            .filter(item => item.productId === currentItem.productId)
            .reduce((sum, item) => sum + (item.qtyPcs || 0), 0);

        // Available = (Stock currently in DB) + (What this challan already took) - (What we've added to the list in this session)
        const availablePcs = (p.quantity || 0) + originalSavedPcs - alreadyInListPcs;

        const unit = currentItem.unit;
        if (unit === 'pcs') return availablePcs.toFixed(1);
        if (unit === 'packet') return p.pcsPerPacket > 0 ? (availablePcs / p.pcsPerPacket).toFixed(1) : '0.0';
        const pcsPerLinear = p.packetsPerLinear * p.pcsPerPacket;
        return pcsPerLinear > 0 ? (availablePcs / pcsPerLinear).toFixed(1) : '0.0';
    };



    const generatePDF = (savedItems, header) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const leftX = 14;
        const rightEdge = pageWidth - 14;

        // ===== HEADER SECTION =====
        // 1. Logo (Left side) - Sized for a professional look
        try {
            doc.addImage(logo, 'PNG', 15, 12, 45, 38);
        } catch (e) {
            console.error('Logo error:', e);
        }

        // 2. Title (Center) - Vertically aligned
        doc.setFont('times', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(0, 0, 0);
        doc.text('DELIVERY', pageWidth / 2, 28, { align: 'center' });
        doc.text('CHALLAN', pageWidth / 2, 38, { align: 'center' });

        // 3. Company Details (Right side - Block Left Aligned)
        const companyX = pageWidth - 68;
        let companyY = 18;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Welltouch Hygiene Pvt. Ltd.', companyX, companyY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const lineHeight = 5;
        companyY += 6;
        doc.text('Block no 963, Kim Mandavi Road,', companyX, companyY);
        companyY += lineHeight;
        doc.text('Tadkeshwar, Surat - Gujarat 394170', companyX, companyY);
        companyY += lineHeight;
        doc.text('Ph_No: 8141100123', companyX, companyY);
        companyY += lineHeight;
        doc.text('GSTIN: 24AADCW4754B1ZK', companyX, companyY);
        companyY += lineHeight;
        doc.text('www.welltouchhygiene.com', companyX, companyY);
        companyY += lineHeight;
        doc.text('welltouchhygiene@gmail.com', companyX, companyY);

        // Horizontal line - Positioned closer to header content
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.line(leftX, 56, rightEdge, 56);

        // ===== INFO SECTION (Unified) =====
        let infoY = 64;
        const col2X = pageWidth / 2 + 10; // Start of right column (~115mm)

        // Helper to get full info from customer ID
        const getCustInfo = (id, overrideName, overrideAddr) => {
            const c = customers.find(cust => cust._id === id);
            return {
                name: (overrideName || c?.name || 'N/A').toUpperCase(),
                address: overrideAddr || c?.address || 'N/A',
                gst: c?.gst || 'N/A',
                phone: c?.phone || 'N/A'
            };
        };

        const billInfo = getCustInfo(header.customer?._id || header.customer || header.customerId);
        let leftY = infoY;

        // --- LEFT COLUMN: Challan & Transport ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // 1. Challan & Date
        doc.text(`Challan no# ${header.challanNumber || 'N/A'}`, leftX, leftY);
        leftY += 5;
        doc.text(`Date: ${format(new Date(header.date), 'dd-MM-yyyy')}`, leftX, leftY);
        leftY += 5;
        doc.text(`Dispatch Through: ${header.dispatchThrough || 'By Road'}`, leftX, leftY);

        // 2. Transport & Destination
        leftY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Transport Detail:', leftX, leftY);
        doc.setFont('helvetica', 'normal');
        leftY += 5;
        doc.text(`Name: ${header.transport || ''}`, leftX, leftY);
        leftY += 5;
        doc.text(`Vehicle Number: ${header.vehicleNumber || 'N/A'}`, leftX, leftY);
        leftY += 5;
        doc.text(`Destination: ${header.destination || 'N/A'}`, leftX, leftY);

        // 3. Terms
        leftY += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Terms of Delivery :', leftX, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text(header.termsOfDelivery || 'N/A', leftX + 35, leftY);
        const leftBottomY = leftY;

        // --- RIGHT COLUMN: BILL TO & SHIP TO (Small Font) ---
        let rightY = infoY;
        const shipInfo = getCustInfo(header.customer?._id || header.customer || header.customerId, header.shipName, header.shipAddress);

        const custColX = companyX; // Vertically align with Company Details

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        // BILL TO
        doc.text('BILL TO:', custColX, rightY);
        rightY += 4;
        doc.text(billInfo.name, custColX, rightY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const billAddrLines = doc.splitTextToSize(billInfo.address, 54);
        rightY += 4;
        doc.text(billAddrLines, custColX, rightY);
        rightY += (billAddrLines.length * 4);

        doc.text(`Ph: ${billInfo.phone} | GSTIN: ${billInfo.gst}`, custColX, rightY);

        // SHIP TO
        rightY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('SHIP TO:', custColX, rightY);
        rightY += 4;
        doc.text(shipInfo.name, custColX, rightY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const shipAddrLines = doc.splitTextToSize(shipInfo.address, 54);
        rightY += 4;
        doc.text(shipAddrLines, custColX, rightY);
        rightY += (shipAddrLines.length * 4);

        doc.text(`Ph: ${shipInfo.phone} | GSTIN: ${shipInfo.gst}`, custColX, rightY);
        const rightBottomY = rightY;


        // ===== ITEMS TABLE =====
        // Make start position dynamic based on content above
        const tableStartY = Math.max(leftBottomY, rightBottomY) + 12;
        let totalLin = 0, totalPkt = 0, totalPcs = 0;

        const tableData = savedItems.map((item, index) => {
            const p = products.find(prod => prod._id === (item.product?._id || item.product || item.productId));
            const pName = item.productName || p?.name || 'N/A';
            const pSize = item.size || p?.size || '';
            const pType = item.type || p?.type || '';

            const pkPerLin = item.packetsPerLinear || p?.packetsPerLinear || 0;
            const pcsPerPk = item.pcsPerPacket || p?.pcsPerPacket || 0;
            const pcsPerLin = pkPerLin * pcsPerPk;

            // Formatting: 
            // Line 1: ProductName
            // Line 2: Size + Type + "Sanitary Pad"
            // Line 3: Pkt/Lin + Pcs/Pkt + Pcs/Lin
            const detailLine2 = `${pSize} ${pType} Sanitary Pad`;
            const detailLine3 = `${pkPerLin} Pkt/Lin, ${pcsPerPk} Pcs/Pkt (Total ${pcsPerLin} Pcs/Lin)`;
            const fullDetails = `${pName}\n${detailLine2}\n${detailLine3}`;

            const pcs = item.quantityInPcs || (p ? toPcs(item.quantity, item.unit, p) : 0);
            const lin = item.unit === 'linear' ? item.quantity : (pkPerLin > 0 && pcsPerPk > 0 ? (pcs / (pkPerLin * pcsPerPk)) : 0);
            const pkt = item.unit === 'packet' ? item.quantity : (pcsPerPk > 0 ? (pcs / pcsPerPk) : 0);

            totalLin += Number(lin);
            totalPkt += Number(pkt);
            totalPcs += Number(pcs);

            return [
                index + 1,
                fullDetails,
                Number(lin).toFixed(1),
                Number(pkt).toFixed(1),
                Number(pcs).toFixed(0)
            ];
        });

        // Add Totals Row
        tableData.push([
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: totalLin.toFixed(1), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
            { content: totalPkt.toFixed(1), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
            { content: totalPcs.toFixed(0), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }
        ]);

        autoTable(doc, {
            startY: tableStartY,
            head: [['Sr.', 'Product Name', 'Liners', 'Packets', 'Pieces']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [0, 173, 186], textColor: 255, halign: 'center', font: 'helvetica', fontStyle: 'bold', fontSize: 10 },
            styles: { fontSize: 9, cellPadding: 3, font: 'helvetica', textColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { halign: 'right', cellWidth: 25 },
                3: { halign: 'right', cellWidth: 25 },
                4: { halign: 'right', cellWidth: 25 }
            }
        });

        let finalY = doc.lastAutoTable.finalY || tableStartY + 20;

        // Notes Section
        if (header.notes) {
            finalY += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Notes: ', leftX, finalY);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const notesText = header.notes;
            doc.text(notesText, leftX + 13, finalY);
        }

        // ===== FOOTER SECTION =====
        const footerY = pageHeight - 25;

        // Jurisdiction Notice - Bottom Left
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('* Subject to Surat Jurisdiction', leftX, pageHeight - 12);

        // Signatures
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("Receiver's Signature", leftX, footerY);

        // Authorized Sign Block
        doc.setFont('helvetica', 'bold');
        doc.text('Authorized Signature', rightEdge, footerY - 2, { align: 'right' });
        doc.text('For Welltouch Hygiene Pvt. Ltd.', rightEdge, footerY + 3, { align: 'right' });

        // Save PDF
        const fileName = `${header.challanNumber || 'CH-New'}.pdf`;
        doc.save(fileName);
    };

    const handleDelete = async (id) => {
        const challanToDelete = challans.find(c => c._id === id);
        if (!challanToDelete) return;

        if (!window.confirm(`Delete challan ${challanToDelete.challanNumber}? This will restore the stock for all items in this challan.`)) return;

        try {
            // Then delete the challan record (Backend now handles stock restoration)
            await deleteChallan(id);
            setMessage({ type: 'success', text: 'Challan deleted and stock restored' });
            loadInitialData();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete challan' });
        }
    };

    const handleEdit = (challan) => {
        setEditingChallan(challan);
        setHeaderData({
            customerId: challan.customer?._id || challan.customer,
            address: challan.address || '',
            shipName: challan.shipName || '',
            shipAddress: challan.shipAddress || '',
            transport: challan.transport || '',
            vehicleNumber: challan.vehicleNumber || '',
            dispatchThrough: challan.dispatchThrough || '',
            termsOfDelivery: challan.termsOfDelivery || '',
            destination: challan.destination || '',
            notes: challan.notes || '',
            date: new Date(challan.date).toISOString().split('T')[0]
        });

        // Map items back to form format
        const formItems = challan.items.map(item => ({
            ...item,
            productId: item.product?._id || item.product,
            qtyPcs: item.quantityInPcs,
            partyId: item.party // Note: party might not be in item if not saved, but we do our best
        }));
        setItems(formItems);

        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMessage({ type: 'info', text: `Editing Challan ${challan.challanNumber}` });
    };

    const cancelEdit = () => {
        setEditingChallan(null);
        setHeaderData({
            customerId: '',
            address: '',
            shipName: '',
            shipAddress: '',
            transport: '',
            vehicleNumber: '',
            dispatchThrough: '',
            termsOfDelivery: '',
            destination: '',
            notes: '',
            date: new Date().toISOString().split('T')[0]
        });
        setItems([]);
        setMessage({ type: '', text: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.length === 0) {
            setMessage({ type: 'error', text: 'Add at least one product' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!headerData.customerId) throw new Error('Please select a customer');

            const transactionsToSave = [];
            const challanItems = [];
            let totalLin = 0, totalPkt = 0, totalPcs = 0;

            for (const item of items) {
                const p = products.find(prod => prod._id === item.productId);
                // Fallback if product not found (might happen if deleted)
                if (!p) continue;

                const qtyPcs = item.qtyPcs;
                const lin = item.unit === 'linear' ? Number(item.quantity) : (p.packetsPerLinear > 0 && p.pcsPerPacket > 0 ? (qtyPcs / (p.packetsPerLinear * p.pcsPerPacket)) : 0);
                const pkt = item.unit === 'packet' ? Number(item.quantity) : (p.pcsPerPacket > 0 ? (qtyPcs / p.pcsPerPacket) : 0);

                totalLin += lin;
                totalPkt += pkt;
                totalPcs += qtyPcs;

                // Re-prepare items for saving
                challanItems.push({
                    product: p._id,
                    productName: p.name,
                    size: p.size,
                    type: p.type,
                    weight: p.weight,
                    quantity: item.quantity,
                    unit: item.unit,
                    quantityInPcs: qtyPcs,
                    packetsPerLinear: p.packetsPerLinear,
                    pcsPerPacket: p.pcsPerPacket
                });

                // Prepare transactions for saving (used for both new and edited challans)
                transactionsToSave.push({
                    productId: p._id,
                    productName: p.name,
                    size: p.size,
                    party: item.partyId,
                    type: 'delivered',
                    quantity: item.quantity,
                    unit: item.unit,
                    date: headerData.date,
                    note: `Challan - Veh: ${headerData.vehicleNumber}`
                });
            }

            let finalChallanData;

            if (editingChallan) {
                // Backend now handles stock reversal and transaction updates atomically
                const res = await updateChallan(editingChallan._id, {
                    customer: headerData.customerId,
                    address: headerData.address,
                    shipName: headerData.shipName,
                    shipAddress: headerData.shipAddress,
                    transport: headerData.transport,
                    vehicleNumber: headerData.vehicleNumber,
                    dispatchThrough: headerData.dispatchThrough,
                    termsOfDelivery: headerData.termsOfDelivery,
                    destination: headerData.destination,
                    notes: headerData.notes,
                    date: headerData.date,
                    items: challanItems,
                    totalLinear: totalLin,
                    totalPackets: totalPkt,
                    totalPieces: totalPcs
                });
                finalChallanData = res.data.data || res.data;
                setMessage({ type: 'success', text: 'Challan updated and PDF generated!' });
            } else {
                // Backend now handles stock deduction and transaction creation atomically
                const savedChallanRes = await saveChallan({
                    customer: headerData.customerId,
                    address: headerData.address,
                    shipName: headerData.shipName,
                    shipAddress: headerData.shipAddress,
                    transport: headerData.transport,
                    vehicleNumber: headerData.vehicleNumber,
                    dispatchThrough: headerData.dispatchThrough,
                    termsOfDelivery: headerData.termsOfDelivery,
                    destination: headerData.destination,
                    notes: headerData.notes,
                    date: headerData.date,
                    items: challanItems,
                    totalLinear: totalLin,
                    totalPackets: totalPkt,
                    totalPieces: totalPcs
                });

                finalChallanData = savedChallanRes.data.data || savedChallanRes.data;
                setMessage({ type: 'success', text: 'Challan saved and PDF generated!' });
            }

            // Generate PDF with the returned challan data
            generatePDF([...challanItems], finalChallanData);

            cancelEdit(); // Reset form
            loadInitialData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || err.message });
        } finally {
            setLoading(false);
        }
    };

    const paginatedChallans = Array.isArray(challans) ? challans.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    ) : [];

    return (
        <div className="w-full mx-auto px-4 py-8 space-y-12">
            {/* Form Section */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <div className="bg-primary-50 p-3 rounded-2xl">
                            <img src={logo} alt="Welltouch" className="h-10 w-auto" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                                {editingChallan ? `Edit Challan ${editingChallan.challanNumber}` : 'New Challan'}
                            </h1>
                            <p className="text-gray-500 font-medium">Generate professional delivery documents</p>
                        </div>
                    </div>
                    {editingChallan && (
                        <button
                            onClick={cancelEdit}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-6 rounded-xl transition-all"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <div className="space-y-10">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Bill To (Customer)</label>
                            <select
                                name="customerId"
                                required
                                disabled={!isEditable}
                                value={headerData.customerId}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all appearance-none cursor-pointer ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                            >
                                <option value="">Select Customer</option>
                                {customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Challan Date</label>
                            <input
                                type="date"
                                name="date"
                                required
                                disabled={!isEditable}
                                value={headerData.date}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Transport Name</label>
                            <select
                                name="transport"
                                disabled={!isEditable}
                                value={headerData.transport}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all appearance-none cursor-pointer ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                            >
                                <option value="">Select Transport</option>
                                {transports.slice().sort((a, b) => a.name.localeCompare(b.name)).map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Vehicle Number</label>
                            <select
                                name="vehicleNumber"
                                disabled={!isEditable}
                                value={headerData.vehicleNumber}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all appearance-none cursor-pointer ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                            >
                                <option value="">Select Vehicle</option>
                                {transports.find(t => t.name === headerData.transport)?.vehicles?.map((v, i) => (
                                    <option key={i} value={v}>{v}</option>
                                ))}
                                {!headerData.transport && <option disabled>Select transport first</option>}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Dispatch Through</label>
                            <input
                                type="text"
                                name="dispatchThrough"
                                disabled={!isEditable}
                                value={headerData.dispatchThrough || ''}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                placeholder="By Road"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Terms of Delivery</label>
                            <input
                                type="text"
                                name="termsOfDelivery"
                                disabled={!isEditable}
                                value={headerData.termsOfDelivery || ''}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                placeholder="Ex: FOB, CIF, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Destination</label>
                            <input
                                type="text"
                                name="destination"
                                disabled={!isEditable}
                                value={headerData.destination || ''}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                placeholder="City / Delivery Point"
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Notes</label>
                            <textarea
                                name="notes"
                                disabled={!isEditable}
                                value={headerData.notes || ''}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all h-24 ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                placeholder="Any additional notes..."
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                Billing Address
                                <span className="text-[10px] text-primary-500 ml-2 font-bold cursor-pointer hover:underline" onClick={() => {
                                    const c = customers.find(x => x._id === headerData.customerId);
                                    if (c && c.gst) alert(`GSTIN: ${c.gst}`);
                                }}>
                                    {customers.find(x => x._id === headerData.customerId)?.gst ? `(GST: ${customers.find(x => x._id === headerData.customerId).gst})` : ''}
                                </span>
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={headerData.address}
                                onChange={handleHeaderChange}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all"
                                placeholder="Customer billing address"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Ship To (Name)</label>
                            <select
                                name="shipName"
                                value={headerData.shipName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const selectedCust = customers.find(c => c.name === val);
                                    setHeaderData(prev => ({
                                        ...prev,
                                        shipName: val,
                                        shipAddress: selectedCust ? (selectedCust.address || '') : prev.shipAddress
                                    }));
                                }}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Same as Bill To</option>
                                {customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Shipping Address</label>
                            <input
                                type="text"
                                name="shipAddress"
                                disabled={!isEditable}
                                value={headerData.shipAddress}
                                onChange={handleHeaderChange}
                                className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none font-bold text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                placeholder="Delivery location"
                            />
                        </div>
                    </div>

                    {/* Delivery Form (Add Product) */}
                    <div className="bg-slate-50/30 p-8 rounded-3xl border border-dashed border-slate-200">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3 mb-1">
                            Delivery Form
                        </h2>
                        <p className="text-xs font-bold text-slate-400 mb-6 drop-shadow-sm">Record new delivery/dispatch entries here</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Party</label>
                                <select
                                    name="partyId"
                                    disabled={!isEditable}
                                    value={currentItem.partyId}
                                    onChange={handleCurrentItemChange}
                                    className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-sm text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-300' : ''}`}
                                >
                                    <option value="">Select a party</option>
                                    {parties.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Product</label>
                                <select
                                    name="productId"
                                    value={currentItem.productId}
                                    onChange={handleCurrentItemChange}
                                    disabled={!currentItem.partyId || !isEditable}
                                    className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-sm text-slate-700 shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-300 ${!isEditable ? 'cursor-not-allowed' : ''}`}
                                >
                                    <option value="">{currentItem.partyId ? 'Select a product' : 'Select a party first'}</option>
                                    {products
                                        .filter(p => !currentItem.partyId || (p.party?._id || p.party) === currentItem.partyId)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(p => (
                                            <option key={p._id} value={p._id}>
                                                {p.name} - {p.size} ({p.type}) - {p.weight}gm | {p.packetsPerLinear} Pkt/Lin, {p.pcsPerPacket} Pcs/Pkt
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Unit</label>
                                <select
                                    name="unit"
                                    disabled={!isEditable}
                                    value={currentItem.unit}
                                    onChange={handleCurrentItemChange}
                                    className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-sm text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-300' : ''}`}
                                >
                                    <option value="packet">Packets</option>
                                    <option value="linear">Linear</option>
                                    <option value="pcs">Pieces</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Quantity <span className="text-[9px] lowercase font-bold text-primary-500">(Stock: {calculateAvailable()})</span>
                                </label>
                                <input
                                    type="number"
                                    name="quantity"
                                    disabled={!isEditable}
                                    step="0.01"
                                    value={currentItem.quantity}
                                    onChange={handleCurrentItemChange}
                                    placeholder="Amount"
                                    className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-sm text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    disabled={!isEditable}
                                    value={currentItem.date}
                                    onChange={handleCurrentItemChange}
                                    className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-bold text-sm text-slate-700 shadow-sm transition-all ${!isEditable ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                {isEditable && (
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="w-full bg-red-600 border-2 border-red-600 text-white hover:bg-white hover:text-red-700 font-black text-xs uppercase tracking-widest py-[14.5px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                                    >
                                        Record Delivery
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Challan Summary Table */}
                    {items.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-4">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary-600 rounded-full"></span>
                                Items Summary ({items.length})
                            </h2>
                            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Pcs</th>
                                            {isEditable && <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-50">
                                        {items.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-700">{item.productName}</div>
                                                    <div className="text-[10px] font-medium text-slate-400">{item.size} • {item.productType} • {item.productWeight}gm • {item.partyName}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-600 text-sm">
                                                    {item.quantity} <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-primary-600 text-sm">
                                                    {item.qtyPcs.toFixed(1)}
                                                </td>
                                                {isEditable && (
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-sm text-slate-400 font-bold flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z" /></svg>
                            Stock will be automatically deducted upon generation
                        </div>
                        {isEditable && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || items.length === 0}
                                className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white font-black text-sm uppercase tracking-widest py-5 px-12 rounded-2xl shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16l-5-5h3V4h4v7h3l-5 5zM5 18h14v2H5v-2z" /></svg>
                                        {editingChallan ? 'Update & Re-generate PDF' : 'Generate & Save Challan'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {message.text && (
                    <div className={`mt-8 p-6 rounded-2xl text-sm font-bold border transition-all animate-in fade-in slide-in-from-bottom-4 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100 shadow-[0_10px_30px_-10px_rgba(34,197,94,0.2)]' : 'bg-red-50 text-red-700 border-red-100 shadow-[0_10px_30px_-10px_rgba(239,68,68,0.2)]'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* History Section */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Recent Challans</h2>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{challans.length} Total</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest rounded-l-2xl">Date</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Challan No</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Transport</th>
                                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Lin</th>
                                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest rounded-r-2xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedChallans.map((c) => (
                                <tr key={c._id} className="group hover:bg-slate-50/70 transition-all">
                                    <td className="px-6 py-5 text-sm font-black text-slate-900">{format(new Date(c.date), 'dd MMM yyyy')}</td>
                                    <td className="px-6 py-5 text-sm font-bold text-primary-600">{c.challanNumber || '-'}</td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-700 capitalize">{c.customer?.name || 'Unknown'}</td>
                                    <td className="px-6 py-5">
                                        <div className="text-xs font-bold text-slate-500">{c.transport || '-'}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{c.vehicleNumber || '-'}</div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-primary-600 tabular-nums">
                                        {c.totalLinear?.toFixed(1) || '0.0'}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => generatePDF(c.items, c)}
                                                className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-primary-600 hover:border-primary-200 hover:shadow-sm rounded-xl transition-all"
                                                title="Print PDF"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16l-5-5h3V4h4v7h3l-5 5zM5 18h14v2H5v-2z" /></svg>
                                            </button>
                                            {isEditable && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(c)}
                                                        className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm rounded-xl transition-all"
                                                        title="Edit Record"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(c._id)}
                                                        className="p-3 bg-white border border-slate-100 text-slate-200 hover:text-red-500 hover:border-red-100 hover:shadow-sm rounded-xl transition-all"
                                                        title="Delete Record"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {challans.length > pageSize && (
                    <div className="mt-10 pt-10 border-t border-slate-50">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={challans.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Challan;
