import React, { useState, useEffect } from 'react';
import { getUsers, updateUser, deleteUser, createUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
        permissions: {
            dashboard: 'none',
            production: 'none',
            challan: 'none',
            products: 'none',
            delivery: 'none',
            transactions: 'none',
            reports: 'none',
            deliveryReport: 'none',
            entities: 'none',
            transports: 'none'
        }
    });

    const modules = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'production', label: 'Production' },
        { id: 'challan', label: 'Challan' },
        { id: 'products', label: 'Products' },
        { id: 'delivery', label: 'Delivery' },
        { id: 'transactions', label: 'Transactions' },
        { id: 'reports', label: 'Reports' },
        { id: 'deliveryReport', label: 'Delivery Report' },
        { id: 'entities', label: 'Party & Customer' },
        { id: 'transports', label: 'Transport' }
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await getUsers();
            setUsers(response.data.users);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch users');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePermissionChange = (module, level) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [module]: level
            }
        }));
    };

    const setAllPermissions = (level) => {
        const updatedPermissions = {};
        modules.forEach(mod => {
            updatedPermissions[mod.id] = level;
        });
        setFormData(prev => ({
            ...prev,
            permissions: updatedPermissions
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            if (editingUser) {
                await updateUser(editingUser._id, formData);
                setSuccess('User updated successfully');
            } else {
                await createUser(formData);
                setSuccess('User created successfully');
            }
            setIsModalOpen(false);
            fetchUsers();
            resetForm();
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Don't show password
            role: user.role,
            permissions: user.permissions || {
                dashboard: 'none',
                production: 'none',
                challan: 'none',
                products: 'none',
                delivery: 'none',
                transactions: 'none',
                reports: 'none',
                deliveryReport: 'none',
                entities: 'none',
                transports: 'none'
            }
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await deleteUser(id);
                fetchUsers();
                setSuccess('User deleted successfully');
            } catch (err) {
                setError('Failed to delete user');
            }
        }
    };

    const resetForm = () => {
        setEditingUser(null);
        setShowPassword(false);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'user',
            permissions: {
                dashboard: 'none',
                production: 'none',
                challan: 'none',
                products: 'none',
                delivery: 'none',
                transactions: 'none',
                reports: 'none',
                deliveryReport: 'none',
                entities: 'none',
                transports: 'none'
            }
        });
    };

    if (currentUser?.role !== 'super_user') {
        return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition"
                >
                    Add New Member
                </button>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}
            {success && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{success}</div>}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-4 text-center">Loading...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-4 text-center">No members found</td></tr>
                            ) : users.map((u) => (
                                <tr key={u._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{u.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap capitalize">{u.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(u)} className="text-primary-600 hover:text-primary-900 mr-4">Edit Rights</button>
                                        <button onClick={() => handleDelete(u._id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit Member Rights' : 'Add New Member'}</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Password {editingUser && <span className="text-xs text-gray-500">(leave blank to keep current)</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                required={!editingUser}
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 pr-10 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                                                placeholder={editingUser ? "Enter new password to change" : ""}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                            >
                                                {showPassword ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                                        <h3 className="font-semibold text-gray-800">Department Rights</h3>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAllPermissions('view')}
                                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                                            >
                                                Set All to View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAllPermissions('edit')}
                                                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition"
                                            >
                                                Set All to Edit
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {modules.map((mod) => (
                                            <div key={mod.id} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                                <p className="font-medium text-sm mb-2 text-primary-800">{mod.label}</p>
                                                <div className="flex space-x-4">
                                                    {['none', 'view', 'edit'].map((level) => (
                                                        <label key={level} className="inline-flex items-center text-xs">
                                                            <input
                                                                type="radio"
                                                                name={`perm-${mod.id}`}
                                                                value={level}
                                                                checked={formData.permissions[mod.id] === level}
                                                                onChange={() => handlePermissionChange(mod.id, level)}
                                                                className="text-primary-600 focus:ring-primary-500 h-3 w-3"
                                                            />
                                                            <span className="ml-1 capitalize">{level}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm"
                                    >
                                        {editingUser ? 'Save Changes' : 'Create Member'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
