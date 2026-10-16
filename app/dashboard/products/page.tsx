'use client';

import { useEffect, useState } from 'react';
import { SIZE_BADGES, SIZE_LABELS, SIZE_TYPES, SizeType } from '@/lib/distribution';

interface Product {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  category?: { _id: string; name: string };
  sizeType?: SizeType;
  warehouse?: { _id: string; code: string; name: string };
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  barcode?: string;
  isActive: boolean;
}

interface Warehouse {
  _id: string;
  code: string;
  name: string;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
  type: 'ingredient' | 'product';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showManageCategoryModal, setShowManageCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    sizeType: 'kecil' as SizeType,
    warehouse: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 10,
    unit: 'pcs',
    barcode: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    type: 'product' as 'ingredient' | 'product',
  });

  useEffect(() => {
    loadProducts();
  }, [filterCategory]);

  useEffect(() => {
    loadCategories();
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/warehouses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.data || []);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const generateSKU = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = Array.from({ length: 3 }, () => 
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join('');
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000);
    return `${randomLetters}${randomNumbers}`;
  };

  const formatNumberWithDots = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseNumberWithDots = (value: string): number => {
    return Number(value.replace(/\./g, ''));
  };

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = filterCategory 
        ? `/api/products?category=${filterCategory}`
        : '/api/products';
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Products loaded:', data);
        setProducts(data.products || data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Categories loaded:', data);
        // API returns {categories: [...]} not {data: [...]}
        setCategories(data.categories || data.data || []);
      } else {
        console.error('Failed to load categories:', response.status);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingProduct 
        ? `/api/products/${editingProduct._id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingProduct ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!');
        setShowModal(false);
        resetForm();
        loadProducts();
      } else {
        const error = await response.json();
        alert(error.error || error.message || 'Gagal menyimpan produk!');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category?._id || '',
      sizeType: product.sizeType || 'kecil',
      warehouse: product.warehouse?._id || '',
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      barcode: product.barcode || '',
    });
    loadCategories(); // Reload categories when editing
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Produk berhasil dihapus!');
        loadProducts();
      } else {
        alert('Gagal menghapus produk!');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingCategory 
        ? `/api/categories/${editingCategory._id}`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      console.log('Saving category with data:', categoryForm);
      console.log('Method:', method, 'URL:', url);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(categoryForm),
      });

      const result = await response.json();
      console.log('Response:', result);

      if (response.ok) {
        alert(editingCategory ? 'Kategori berhasil diupdate!' : 'Kategori berhasil ditambahkan!');
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', description: '', type: 'product' });
        loadCategories();
      } else {
        alert(`Gagal menyimpan kategori! ${result.error || ''}`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      type: category.type,
    });
    setShowCategoryModal(true);
    setShowManageCategoryModal(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Kategori berhasil dihapus!');
        loadCategories();
        loadProducts();
      } else {
        alert('Gagal menghapus kategori!');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: '',
      sizeType: 'kecil',
      warehouse: '',
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 10,
      unit: 'pcs',
      barcode: '',
    });
  };

  const filteredProducts = products.filter(product =>
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!filterWarehouse || product.warehouse?._id === filterWarehouse) &&
    (!filterSize || (product.sizeType || 'kecil') === filterSize)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="🔍 Cari produk (nama atau kode barang)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-64 max-w-md px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
        />
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowManageCategoryModal(true)}
            className="px-3 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium focus:ring-4 focus:ring-gray-400/40 focus:outline-none"
          >
            📂 Kelola Kategori
          </button>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryForm({ name: '', description: '', type: 'product' });
              setShowCategoryModal(true);
            }}
            className="px-3 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium focus:ring-4 focus:ring-gray-400/40 focus:outline-none"
          >
            + Kategori
          </button>
          <button
            onClick={() => {
              resetForm();
              setFormData(prev => ({ ...prev, sku: generateSKU() }));
              loadCategories(); // Reload categories when opening modal
              setShowModal(true);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
          >
            + Tambah Produk
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setFilterCategory('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap focus:ring-4 focus:ring-amber-400/50 focus:outline-none ${
              filterCategory === ''
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Semua ({products.length})
        </button>
        {categories.map(category => (
          <button
            key={category._id}
            onClick={() => setFilterCategory(category._id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap focus:ring-4 focus:ring-amber-400/50 focus:outline-none ${
              filterCategory === category._id
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {category.name}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
              aria-label="Filter gudang"
            >
              <option value="">Semua Gudang</option>
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
              aria-label="Filter ukuran"
            >
              <option value="">Semua Ukuran</option>
              {SIZE_TYPES.map(size => (
                <option key={size} value={size}>{SIZE_LABELS[size]}</option>
              ))}
            </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kode Barang
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ukuran
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gudang
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga Jual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga Beli
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-900">{product.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-gray-900 min-w-56">{product.name}</div>
                      {product.category && (
                        <div className="text-xs text-purple-700">{product.category.name}</div>
                      )}
                      {product.description && (
                        <div className="text-sm text-gray-700">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm ${SIZE_BADGES[product.sizeType || 'kecil']}`}>
                      {SIZE_LABELS[product.sizeType || 'kecil']}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {product.warehouse?.name || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(product.price)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-gray-700">
                      {formatCurrency(product.cost)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        product.stock <= product.minStock 
                          ? 'text-red-600' 
                          : product.stock <= product.minStock * 2
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {product.stock}
                      </span>
                      <span className="text-gray-700 text-sm">
                        {product.unit}
                      </span>
                      {product.stock <= product.minStock && (
                        <span className="text-red-600">⚠️</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      product.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {product.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-700 hover:text-blue-900 mr-3 focus:ring-2 focus:ring-amber-500/50 focus:outline-none rounded px-2 py-1"
                      aria-label="Edit product"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="text-red-700 hover:text-red-900 focus:ring-2 focus:ring-red-500/50 focus:outline-none rounded px-2 py-1"
                      aria-label="Delete product"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">📦</span>
              <p>Belum ada produk</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kode Barang * {!editingProduct && <span className="text-xs text-gray-500">(otomatis, bisa diubah)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Tanpa Kategori</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="pcs">Pcs</option>
                    <option value="kg">Kg</option>
                    <option value="gram">Gram</option>
                    <option value="liter">Liter</option>
                    <option value="ml">ML</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="dus">Dus</option>
                    <option value="karton">Karton</option>
                    <option value="sak">Sak</option>
                    <option value="bal">Bal</option>
                    <option value="lusin">Lusin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe Ukuran *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZE_TYPES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFormData({...formData, sizeType: size})}
                        className={`py-2 rounded-lg text-sm font-medium border ${
                          formData.sizeType === size
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {SIZE_LABELS[size]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gudang *
                  </label>
                  <select
                    required
                    value={formData.warehouse}
                    onChange={(e) => setFormData({...formData, warehouse: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Pilih Gudang</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.code} - {w.name}</option>
                    ))}
                  </select>
                  {warehouses.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">Belum ada gudang. Tambahkan di menu Gudang dulu.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga Jual *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Rp</span>
                    <input
                      type="text"
                      required
                      value={formData.price > 0 ? formatNumberWithDots(formData.price) : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({...formData, price: value ? Number(value) : 0});
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga Beli *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Rp</span>
                    <input
                      type="text"
                      required
                      value={formData.cost > 0 ? formatNumberWithDots(formData.cost) : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({...formData, cost: value ? Number(value) : 0});
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stok Awal *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stok *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium"
                >
                  {editingProduct ? 'Update' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
            </h2>
            
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryForm({ name: '', description: '', type: 'product' });
                  }}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium"
                >
                  {editingCategory ? 'Update' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Kelola Kategori</h2>
              <button
                onClick={() => setShowManageCategoryModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl block mb-2">📂</span>
                  <p>Belum ada kategori</p>
                </div>
              ) : (
                categories.map(category => (
                  <div
                    key={category._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category._id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowManageCategoryModal(false)}
                className="w-full py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
