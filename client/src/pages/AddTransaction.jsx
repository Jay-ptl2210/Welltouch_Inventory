import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, addTransaction } from '../services/api';
import { format } from 'date-fns';

function AddTransaction() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        productName: '',
        size: '',
        type: 'produce',
        quantity: '',
        unit: 'pcs',
        date: format(new Date(), 'yyyy-MM-dd'),
        note: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [sizes, setSizes] = useState([]);

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (formData.productName) {
            const productSizes = [...new Set(
                products
                    .filter(p => p.name === formData.productName)
                    .map(p => p.size)
            )];
            setSizes(productSizes);
            if (!productSizes.includes(formData.size)) {
                setFormData(prev => ({ ...prev, size: '' }));
            }
        } else {
            setSizes([]);
        }
    }, [formData.productName, products]);

    const loadProducts = async () => {
        try {
            const response = await getProducts();
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to load products', error);
        }
    };

    const toPcs = (q, unit, product) => {
        const packetsPerLinear = Number(product.packetsPerLinear) || 0;
        const pcsPerPacket = Number(product.pcsPerPacket) || 0;
        const qty = Number(q);
        if (Number.isNaN(qty) || qty < 0) {
            throw new Error('Quantity must be a positive number');
        }
        if (packetsPerLinear <= 0 || pcsPerPacket <= 0) {
            throw new Error('Invalid conversion factors');
        }
        if (unit === 'linear') return qty * packetsPerLinear * pcsPerPacket;
        if (unit === 'packet') return qty * pcsPerPacket;
        return qty;
    };

    const fromPcs = (pcs, unit, product) => {
        const packetsPerLinear = Number(product.packetsPerLinear) || 0;
        const pcsPerPacket = Number(product.pcsPerPacket) || 0;
        const value = Number(pcs) || 0;
        if (unit === 'linear' && packetsPerLinear > 0 && pcsPerPacket > 0) {
            return value / (packetsPerLinear * pcsPerPacket);
        }
        if (unit === 'packet' && pcsPerPacket > 0) {
            return value / pcsPerPacket;
        }
        return value;
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Find the product that matches both name and size
            const selectedProduct = products.find(
                p => p.name === formData.productName && p.size === formData.size
            );
            if (!selectedProduct) {
                throw new Error('Product with selected name and size not found');
            }

            // Validate delivery quantity before submitting
            const deliveryQuantityPcs = toPcs(formData.quantity, formData.unit, selectedProduct);
            if (formData.type === 'delivered' && deliveryQuantityPcs > selectedProduct.quantity) {
                setMessage({
                    type: 'error',
                    text: `Insufficient stock! Current stock: ${selectedProduct.quantity.toFixed(2)} pcs, Delivery quantity: ${deliveryQuantityPcs.toFixed(2)} pcs`
                });
                setLoading(false);
                return;
            }

            const transactionDate = formData.date
                ? new Date(formData.date).toISOString()
                : new Date().toISOString();

            // Use _id if available, otherwise fall back to id (Mongoose converts _id to id in JSON)
            const productId = selectedProduct._id || selectedProduct.id;

            if (!productId) {
                throw new Error('Product ID not found');
            }

            await addTransaction({
                productId: productId,
                productName: formData.productName,
                size: formData.size,
                type: formData.type,
                quantity: formData.quantity,
                unit: formData.unit,
                date: transactionDate,
                note: formData.note || ''
            });

            setMessage({ type: 'success', text: 'Transaction recorded successfully!' });

            // Redirect back to manage products after short delay
            setTimeout(() => {
                navigate('/manage-products');
            }, 1500);

        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to record transaction'
            });
        } finally {
            setLoading(false);
        }
    };

    const uniqueProductNames = [...new Set(products.map(p => p.name))];

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-3 md:p-8">
                <h2 className="text-xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Add Transaction</h2>

                {message.text && (
                    <div
                        className={`mb-3 md:mb-4 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base rounded ${message.type === 'success'
                            ? 'bg-green-100 border border-green-400 text-green-700'
                            : 'bg-red-100 border border-red-400 text-red-700'
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                        <label htmlFor="productName" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Product <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="productName"
                            name="productName"
                            required
                            value={formData.productName}
                            onChange={handleFormChange}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                            style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
                        >
                            <option value="">Select a product</option>
                            {uniqueProductNames.map(name => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                        <label htmlFor="size" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Size <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="size"
                            name="size"
                            required
                            value={formData.size}
                            onChange={handleFormChange}
                            disabled={!formData.productName}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
                            style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
                        >
                            <option value="">Select size</option>
                            {sizes.map(size => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="packetsPerLinear" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Packets per Linear <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            disabled
                            value={(() => {
                                const p = products.find(prod => prod.name === formData.productName && prod.size === formData.size);
                                return p ? p.packetsPerLinear : '';
                            })()}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            placeholder="Auto-filled from product"
                        />
                    </div>

                    <div>
                        <label htmlFor="pcsPerPacket" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Pcs per Packet <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            disabled
                            value={(() => {
                                const p = products.find(prod => prod.name === formData.productName && prod.size === formData.size);
                                return p ? p.pcsPerPacket : '';
                            })()}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            placeholder="Auto-filled from product"
                        />
                    </div>

                    <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                        <label htmlFor="type" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Transaction Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="type"
                            name="type"
                            required
                            value={formData.type}
                            onChange={handleFormChange}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                            style={{ maxWidth: '100%', boxSizing: 'border-box', width: '100%' }}
                        >
                            <option value="produce">Produce (Add)</option>
                            <option value="delivered">Delivered (Subtract)</option>
                        </select>
                    </div>

                    <div className="relative overflow-hidden" style={{ maxWidth: '100%' }}>
                        <label htmlFor="unit" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Unit <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="unit"
                            name="unit"
                            required
                            value={formData.unit}
                            onChange={handleFormChange}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                        >
                            <option value="linear">Linear</option>
                            <option value="packet">Packets</option>
                            <option value="pcs">Pieces</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="quantity" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Quantity <span className="text-red-500">*</span>
                            {formData.productName && formData.size && formData.type === 'delivered' && (
                                <span className="ml-2 text-xs text-gray-500">
                                    {(() => {
                                        const product = products.find(p => p.name === formData.productName && p.size === formData.size);
                                        if (!product) return '(Stock: 0)';
                                        const available = fromPcs(product.quantity, formData.unit, product);
                                        return `(Stock: ${available.toFixed(2)} ${formData.unit === 'linear' ? 'linear' : formData.unit === 'packet' ? 'packets' : 'pcs'})`;
                                    })()}
                                </span>
                            )}
                        </label>
                        <input
                            type="number"
                            id="quantity"
                            name="quantity"
                            required
                            step="0.01"
                            min="0"
                            max={(() => {
                                if (formData.type !== 'delivered') return undefined;
                                const product = products.find(p => p.name === formData.productName && p.size === formData.size);
                                if (!product) return undefined;
                                return fromPcs(product.quantity, formData.unit, product);
                            })()}
                            value={formData.quantity}
                            onChange={handleFormChange}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                            placeholder="Enter quantity"
                        />
                    </div>

                    <div>
                        <label htmlFor="date" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            id="date"
                            name="date"
                            value={formData.date}
                            onChange={handleFormChange}
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                        />
                    </div>

                    <div>
                        <label htmlFor="note" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Note <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <textarea
                            id="note"
                            name="note"
                            value={formData.note}
                            onChange={handleFormChange}
                            rows="2"
                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
                            placeholder="Add a note (optional)"
                        />
                    </div>

                    <div className="flex gap-4 mt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/manage-products')}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 md:py-3 px-6 text-sm md:text-base rounded-lg font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-primary-600 text-white py-2 md:py-3 px-6 text-sm md:text-base rounded-lg font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                        >
                            {loading ? 'Recording...' : 'Record Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddTransaction;
