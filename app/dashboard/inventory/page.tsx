'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  _id: string;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  category: { name: string };
  cost: number;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: { _id: string; name: string };
  items: Array<{
    product: { _id: string; name: string };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    receivedQuantity: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
}

interface Supplier {
  _id: string;
  name: string;
  phone: string;
}

interface POFormData {
  supplier: string;
  status: string;
  orderDate: string;
  expectedDate: string;
  tax: number;
  notes: string;
  items: Array<{
    product: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function InventoryPage() {
  const router = useRouter();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const [poFormData, setPOFormData] = useState<POFormData>({
    supplier: '',
    status: 'draft',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    tax: 0,
    notes: '',
    items: [{ product: '', quantity: 1, unitPrice: 0 }],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load inventory report for low stock
      const inventoryRes = await fetch('/api/reports/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setLowStockProducts(data.data?.lowStock || []);
      }

      // Load purchase orders
      const poRes = await fetch('/api/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (poRes.ok) {
        const data = await poRes.json();
        setPurchaseOrders(data.data || []);
      }

      // Load suppliers
      const suppliersRes = await fetch('/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.suppliers || data.data || []);
      }

      // Load all products
      const productsRes = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (productsRes.ok) {
        const data = await productsRes.json();
        console.log('All products loaded:', data);
        setAllProducts(data.products || data.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveGoods = async (poId: string, items: any[]) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        alert('Barang berhasil diterima!');
        setShowReceiveModal(false);
        loadData();
      } else {
        alert('Gagal menerima barang!');
      }
    } catch (error) {
      console.error('Error receiving goods:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const resetPOForm = () => {
    setEditingPO(null);
    setPOFormData({
      supplier: '',
      status: 'draft',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: '',
      tax: 0,
      notes: '',
      items: [{ product: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleAddItem = () => {
    setPOFormData({
      ...poFormData,
      items: [...poFormData.items, { product: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (poFormData.items.length > 1) {
      const newItems = poFormData.items.filter((_, i) => i !== index);
      setPOFormData({ ...poFormData, items: newItems });
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    console.log('handleItemChange:', index, field, value);
    const newItems = [...poFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    console.log('Updated items:', newItems);
    setPOFormData({ ...poFormData, items: newItems });
  };

  const calculateSubtotal = () => {
    return poFormData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + poFormData.tax;
  };

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingPO 
        ? `/api/purchase-orders/${editingPO._id}`
        : '/api/purchase-orders';
      
      const method = editingPO ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(poFormData),
      });

      if (response.ok) {
        alert(editingPO ? 'PO berhasil diupdate!' : 'PO berhasil dibuat!');
        setShowPOModal(false);
        resetPOForm();
        loadData();
      } else {
        const error = await response.json();
        alert(error.message || 'Gagal menyimpan PO!');
      }
    } catch (error) {
      console.error('Error saving PO:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    setPOFormData({
      supplier: po.supplier._id,
      status: po.status,
      orderDate: po.orderDate.split('T')[0],
      expectedDate: po.expectedDate ? po.expectedDate.split('T')[0] : '',
      tax: po.tax || 0,
      notes: po.notes || '',
      items: po.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    setShowPOModal(true);
  };

  const handleDeletePO = async (id: string) => {
    if (!confirm('Yakin ingin menghapus PO ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('PO berhasil dihapus!');
        loadData();
      } else {
        alert('Gagal menghapus PO!');
      }
    } catch (error) {
      console.error('Error deleting PO:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleCancelPO = async (id: string) => {
    if (!confirm('Yakin ingin membatalkan PO ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        alert('PO berhasil dibatalkan!');
        loadData();
      } else {
        alert('Gagal membatalkan PO!');
      }
    } catch (error) {
      console.error('Error cancelling PO:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-amber-100 text-amber-700',
      partial: 'bg-yellow-100 text-yellow-700',
      received: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                Perhatian! {lowStockProducts.length} produk stok rendah
              </p>
              <p className="text-xs text-red-700 mt-1">
                Segera lakukan pemesanan untuk menghindari kehabisan stok
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-medium">Stok Rendah</p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {lowStockProducts.length}
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-2.5">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-medium">PO Pending</p>
              <p className="text-xl font-bold text-yellow-600 mt-1">
                {purchaseOrders.filter(po => po.status === 'sent' || po.status === 'partial').length}
              </p>
            </div>
            <div className="bg-yellow-100 rounded-full p-2.5">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-medium">PO Selesai</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {purchaseOrders.filter(po => po.status === 'received').length}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-2.5">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-medium">Total PO</p>
              <p className="text-xl font-bold text-amber-600 mt-1">
                {purchaseOrders.length}
              </p>
            </div>
            <div className="bg-amber-100 rounded-full p-2.5">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Products */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Produk Stok Rendah</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Produk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stok
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Min. Stok
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lowStockProducts.map(product => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{product.sku}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{product.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-red-600">
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">
                        {product.minStock} {product.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        ⚠️ Rendah
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Purchase Orders</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/suppliers')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium focus:ring-4 focus:ring-gray-500/50 focus:outline-none"
            >
              🏢 Atur Supplier
            </button>
            <button
              onClick={() => {
                console.log('Opening PO Modal - Suppliers:', suppliers.length, 'Products:', allProducts.length);
                resetPOForm();
                setShowPOModal(true);
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
            >
              + Buat PO
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  PO Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchaseOrders.map(po => (
                <tr key={po._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold">{po.poNumber}</span>
                  </td>
                  <td className="px-4 py-3">{po.supplier.name}</td>
                  <td className="px-4 py-3">
                    {po.items.length} item
                    {po.items.length > 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatCurrency(po.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(po.status)}`}>
                      {po.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(po.orderDate).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(po.status === 'sent' || po.status === 'partial') && (
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setShowReceiveModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 font-medium text-sm"
                        >
                          Terima
                        </button>
                      )}
                      {po.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleEditPO(po)}
                            className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePO(po._id)}
                            className="text-red-600 hover:text-red-900 font-medium text-sm"
                          >
                            Hapus
                          </button>
                        </>
                      )}
                      {(po.status === 'draft' || po.status === 'sent') && (
                        <button
                          onClick={() => handleCancelPO(po._id)}
                          className="text-orange-600 hover:text-orange-900 font-medium text-sm"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {purchaseOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">📋</span>
              <p>Belum ada Purchase Order</p>
            </div>
          )}
        </div>
      </div>

      {/* Receive Goods Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Terima Barang</h2>
            <p className="text-gray-600 mb-4">
              PO: <span className="font-semibold">{selectedPO.poNumber}</span>
            </p>

            <div className="space-y-3 mb-6">
              {selectedPO.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{item.product.name}</div>
                      <div className="text-sm text-gray-600">
                        Dipesan: {item.quantity} | Diterima: {item.receivedQuantity}
                      </div>
                    </div>
                    <div className="font-bold">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const items = selectedPO.items.map(item => ({
                    product: item.product._id,
                    receivedQty: item.quantity - item.receivedQuantity,
                  }));
                  handleReceiveGoods(selectedPO._id, items);
                }}
                className="flex-1 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium"
              >
                Terima Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Form Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl my-8">
            <h2 className="text-2xl font-bold mb-6">
              {editingPO ? 'Edit Purchase Order' : 'Buat Purchase Order Baru'}
            </h2>

            <form onSubmit={handleSubmitPO} className="space-y-6">
              {/* Supplier & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <select
                    required
                    value={poFormData.supplier}
                    onChange={(e) => setPOFormData({...poFormData, supplier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Pilih Supplier</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={poFormData.status}
                    onChange={(e) => setPOFormData({...poFormData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Order *
                  </label>
                  <input
                    type="date"
                    required
                    value={poFormData.orderDate}
                    onChange={(e) => setPOFormData({...poFormData, orderDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Expected
                  </label>
                  <input
                    type="date"
                    value={poFormData.expectedDate}
                    onChange={(e) => setPOFormData({...poFormData, expectedDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Items *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    + Tambah Item
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {poFormData.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <select
                          required
                          value={item.product}
                          onChange={(e) => {
                            console.log('Product selected:', e.target.value);
                            const product = allProducts.find(p => p._id === e.target.value);
                            console.log('Found product:', product);
                            
                            // Update both product and unitPrice in one go
                            const newItems = [...poFormData.items];
                            newItems[index] = {
                              ...newItems[index],
                              product: e.target.value,
                              unitPrice: product ? product.cost : 0
                            };
                            setPOFormData({ ...poFormData, items: newItems });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          disabled={allProducts.length === 0}
                        >
                          <option value="">
                            {allProducts.length === 0 ? 'Tidak ada produk tersedia' : 'Pilih Produk'}
                          </option>
                          {allProducts.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                        {allProducts.length === 0 ? (
                          <div className="text-xs text-red-500 mt-1">
                            ⚠️ Silakan tambahkan produk terlebih dahulu
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-1">
                            {allProducts.length} produk tersedia
                          </div>
                        )}
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Harga"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="w-32 px-3 py-2 bg-gray-100 rounded-lg text-sm font-semibold">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>

                      {poFormData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-900 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Totals */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-lg">{formatCurrency(calculateSubtotal())}</span>
                </div>

                <div className="flex justify-between items-center">
                  <label className="text-gray-700">Pajak (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={poFormData.tax}
                    onChange={(e) => setPOFormData({...poFormData, tax: Number(e.target.value)})}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-between items-center text-xl border-t pt-3">
                  <span className="font-bold text-gray-800">TOTAL:</span>
                  <span className="font-bold text-amber-700">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan
                </label>
                <textarea
                  value={poFormData.notes}
                  onChange={(e) => setPOFormData({...poFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPOModal(false);
                    resetPOForm();
                  }}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 text-white hover:bg-amber-600 rounded-lg font-medium"
                >
                  {editingPO ? 'Update PO' : 'Buat PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
