import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, addTransaction, getParties } from '../services/api';
import { format } from 'date-fns';

function AddTransaction() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        productName: '',
        size: '',
        productType: '', // PPF TF, PPF ST, etc.
        productWeight: '',
        party: '',
        type: 'produce', // produce or delivered
        quantity: '',
        unit: 'linear',
        date: format(new Date(), 'yyyy-MM-dd'),
        note: ''
    });
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [sizes, setSizes] = useState([]);
    const [availableTypes, setAvailableTypes] = useState([]); // Types for the selected Name+Size
    const [availableWeights, setAvailableWeights] = useState([]);

    useEffect(() => {
        loadProducts();
        loadParties();
    }, []);

    const loadParties = async () => {
        try {
            const response = await getParties();
            setParties(response.data);
        } catch (error) {
            console.error('Failed to load parties', error);
        }
    };

    useEffect(() => {
        if (formData.productName) {
            const productSizes = [...new Set(
                products
                    .filter(p => p.name === formData.productName && (p.party?._id || p.party) === formData.party)
                    .map(p => p.size)
            )];
            setSizes(productSizes);
            if (!productSizes.includes(formData.size)) {
                setFormData(prev => ({ ...prev, size: '', productType: '', productWeight: '' }));
            }
        } else {
            setSizes([]);
            setAvailableTypes([]);
            setAvailableWeights([]);
        }
    }, [formData.productName, products, formData.party]);

    useEffect(() => {
        if (formData.productName && formData.size) {
            const types = products
                .filter(p =>
                    p.name === formData.productName &&
                    p.size === formData.size &&
                    (p.party?._id || p.party) === formData.party
                )
                .map(p => p.type || 'PPF TF');

            const uniqueTypes = [...new Set(types)];
            setAvailableTypes(uniqueTypes);

            if (uniqueTypes.length === 1) {
                setFormData(prev => ({ ...prev, productType: uniqueTypes[0] }));
            } else if (!uniqueTypes.includes(formData.productType)) {
                setFormData(prev => ({ ...prev, productType: '' }));
            }
        } else {
            setAvailableTypes([]);
        }
    }, [formData.productName, formData.size, products, formData.party]);

    useEffect(() => {
        if (formData.productName && formData.size && formData.productType) {
            const weights = products
                .filter(p =>
                    p.name === formData.productName &&
                    p.size === formData.size &&
                    (p.type || 'PPF TF') === (formData.productType || 'PPF TF') &&
                    (p.party?._id || p.party) === formData.party
                )
                .map(p => p.weight || 0);

            const uniqueWeights = [...new Set(weights)];
            setAvailableWeights(uniqueWeights);

            if (uniqueWeights.length === 1) {
                setFormData(prev => ({ ...prev, productWeight: uniqueWeights[0] }));
            } else if (!uniqueWeights.includes(Number(formData.productWeight))) {
                setFormData(prev => ({ ...prev, productWeight: '' }));
            }
        } else {
            setAvailableWeights([]);
        }
    }, [formData.productName, formData.size, formData.productType, products, formData.party]);

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
            // Find the product that matches name, size AND type
            const selectedProduct = products.find(
                p => p.name === formData.productName &&
                    p.size === formData.size &&
                    (p.type || 'PPF TF') === (formData.productType || 'PPF TF') &&
                    (p.weight || 0) === (Number(formData.productWeight) || 0) &&
                    (p.party?._id || p.party) === formData.party
            );
            if (!selectedProduct) {
                throw new Error('Product not found (check Name, Size, and Type)');
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

    const uniqueProductNames = [...new Set(
        products
            .filter(p => !formData.party || (p.party?._id || p.party) === formData.party)
            .map(p => p.name)
    )];

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
                    <div className="relative overflow-hidden">
                        <label htmlFor="party" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                            Party <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="party"
                            name="party"
                            required
                            value={formData.party}
                            onChange={(e) => {
                                handleFormChange(e);
                                setFormData(prev => ({ ...prev, productName: '', size: '', productType: '' }));
                            }}
                            className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                        >
                            <option value="">Select a party</option>
                            {parties.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative overflow-hidden">
                            <label htmlFor="productName" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Product <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="productName"
                                name="productName"
                                required
                                value={formData.productName}
                                onChange={handleFormChange}
                                disabled={!formData.party}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">Select product</option>
                                {uniqueProductNames.map(name => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="relative overflow-hidden">
                            <label htmlFor="size" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Size <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="size"
                                name="size"
                                required
                                value={formData.size}
                                onChange={handleFormChange}
                                disabled={!formData.productName}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
                            >
                                <option value="">Select size</option>
                                {sizes.map(size => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative overflow-hidden">
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Weight (gm)
                            </label>
                            {availableWeights.length > 1 ? (
                                <select
                                    name="productWeight"
                                    required
                                    value={formData.productWeight}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                                >
                                    <option value="">Select Weight</option>
                                    {availableWeights.map(w => (
                                        <option key={w} value={w}>{w}gm</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    disabled
                                    value={formData.productWeight !== '' ? `${formData.productWeight}gm` : '-'}
                                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            )}
                        </div>

                        <div className="relative overflow-hidden">
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Type
                            </label>
                            {availableTypes.length > 1 ? (
                                <select
                                    name="productType"
                                    required
                                    value={formData.productType}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                                >
                                    <option value="">Select Type</option>
                                    {availableTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    disabled
                                    value={formData.productType || '-'}
                                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            )}
                        </div>

                        <div>
                            <label htmlFor="packetsPerLinear" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Pkts/Lin <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                disabled
                                value={(() => {
                                    const p = products.find(prod =>
                                        prod.name === formData.productName &&
                                        prod.size === formData.size &&
                                        (prod.type || 'PPF TF') === (formData.productType || 'PPF TF') &&
                                        (prod.weight || 0) === (Number(formData.productWeight) || 0) &&
                                        (prod.party?._id || prod.party) === formData.party
                                    );
                                    return p ? p.packetsPerLinear : '';
                                })()}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                placeholder="Auto"
                            />
                        </div>

                        <div>
                            <label htmlFor="pcsPerPacket" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Pcs/Pkt <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                disabled
                                value={(() => {
                                    const p = products.find(prod =>
                                        prod.name === formData.productName &&
                                        prod.size === formData.size &&
                                        (prod.type || 'PPF TF') === (formData.productType || 'PPF TF') &&
                                        (prod.weight || 0) === (Number(formData.productWeight) || 0) &&
                                        (prod.party?._id || prod.party) === formData.party
                                    );
                                    return p ? p.pcsPerPacket : '';
                                })()}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                placeholder="Auto"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative overflow-hidden">
                            <label htmlFor="type" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Transaction Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="type"
                                name="type"
                                required
                                value={formData.type}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                            >
                                <option value="produce">Produce (Add)</option>
                                <option value="delivered">Delivered (Subtract)</option>
                            </select>
                        </div>

                        <div className="relative overflow-hidden">
                            <label htmlFor="unit" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Unit <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="unit"
                                name="unit"
                                required
                                value={formData.unit}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition appearance-none bg-white"
                            >
                                <option value="linear">Linear</option>
                                <option value="packet">Packets</option>
                                <option value="pcs">Pieces</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="quantity" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Quantity <span className="text-red-500">*</span>
                                {formData.productName && formData.size && formData.type === 'delivered' && (
                                    <span className="ml-1 text-[10px] text-gray-500">
                                        {(() => {
                                            const product = products.find(p =>
                                                p.name === formData.productName &&
                                                p.size === formData.size &&
                                                (p.type || 'PPF TF') === (formData.productType || 'PPF TF') &&
                                                (p.weight || 0) === (Number(formData.productWeight) || 0) &&
                                                (p.party?._id || p.party) === formData.party
                                            );
                                            if (!product) return '(Stock: 0)';
                                            const available = fromPcs(product.quantity, formData.unit, product);
                                            return `(Stock: ${available.toFixed(1)})`;
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
                                    const product = products.find(p =>
                                        p.name === formData.productName &&
                                        p.size === formData.size &&
                                        (p.type || 'PPF TF') === (formData.productType || 'PPF TF') &&
                                        (p.weight || 0) === (Number(formData.productWeight) || 0) &&
                                        (p.party?._id || p.party) === formData.party
                                    );
                                    if (!product) return undefined;
                                    return fromPcs(product.quantity, formData.unit, product);
                                })()}
                                value={formData.quantity}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                                placeholder="Enter quantity"
                            />
                        </div>

                        <div>
                            <label htmlFor="date" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                id="date"
                                name="date"
                                value={formData.date}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="note" className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                            Note <span className="text-gray-400 text-xs">(Optional)</span>
                        </label>
                        <textarea
                            id="note"
                            name="note"
                            value={formData.note}
                            onChange={handleFormChange}
                            rows="1"
                            className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
                            placeholder="Add a note (optional)"
                        />
                    </div>

                    <div className="flex gap-4 mt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/manage-products')}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 px-6 text-sm md:text-base rounded-lg font-semibold hover:bg-gray-200 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-primary-600 text-white py-2 px-6 text-sm md:text-base rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md"
                        >
                            {loading ? 'Recording...' : 'Record Transaction'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}

export default AddTransaction;
