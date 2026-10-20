'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SIZE_BADGES,
  SIZE_LABELS,
  SIZE_TYPES,
  SizeType,
  formatCurrency,
  loadOfItems,
} from '@/lib/distribution';

interface Product {
  _id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  category?: { name: string };
  sizeType?: SizeType;
  warehouse?: { _id: string; code: string; name: string };
  unit: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
}

interface Warehouse {
  _id: string;
  code: string;
  name: string;
}

function productIcon(product: Product) {
  const name = `${product.category?.name || ''} ${product.name}`.toLowerCase();
  if (name.includes('lpg') || name.includes('gas')) return '🔥';
  if (name.includes('galon')) return '💧';
  if (name.includes('cup') || name.includes('botol') || name.includes('kemasan')) return '🥤';
  return '📦';
}

export default function POSPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedSize, setSelectedSize] = useState<SizeType | ''>('');

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    loadProducts();
    loadWarehouses();
    loadCustomers();
  }, []);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products', { headers: authHeaders() });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses', { headers: authHeaders() });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.data || []);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers', { headers: authHeaders() });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || data.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Functional updates so rapid consecutive clicks never overwrite each other
  const setLineQuantity = (product: Product, getQuantity: (current: number) => number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      const quantity = Math.min(getQuantity(existing?.quantity || 0), product.stock);
      if (quantity <= 0) return prev.filter((item) => item.product._id !== product._id);
      const line = { product, quantity, subtotal: product.price * quantity };
      return existing
        ? prev.map((item) => (item.product._id === product._id ? line : item))
        : [...prev, line];
    });
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Stok produk habis!');
      return;
    }
    const current = cart.find((item) => item.product._id === product._id)?.quantity || 0;
    if (current >= product.stock) {
      alert(`Stok tidak mencukupi! Tersisa ${product.stock} ${product.unit}`);
      return;
    }
    setLineQuantity(product, (q) => q + 1);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = cart.find((item) => item.product._id === productId)?.product;
    if (!product) return;
    if (newQuantity > product.stock) {
      alert(`Stok tidak mencukupi! Tersisa ${product.stock} ${product.unit}`);
    }
    setLineQuantity(product, () => newQuantity);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const calculateTotal = () => cart.reduce((total, item) => total + item.subtotal, 0);

  const cartLoad = loadOfItems(cart.map((item) => ({ quantity: item.quantity, sizeType: item.product.sizeType })));

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang kosong!');
      return;
    }
    setDueDate('');
    setNotes('');
    setShowSaveModal(true);
  };

  // Kasir hanya menyimpan transaksi; pembayaran dicatat saat pengiriman
  const saveTransaction = async () => {
    const total = calculateTotal();

    if (!selectedCustomer) {
      alert('Pilih pelanggan dulu. Pembayaran ditagih saat pengiriman.');
      return;
    }

    try {
      setProcessing(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const transactionData = {
        items: cart.map((item) => ({
          product: item.product._id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.subtotal,
        })),
        subtotal: total,
        tax: 0,
        discount: 0,
        total,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        cashier: user.id || user._id,
        cashierName: user.name,
        customer: selectedCustomer._id,
        customerName: selectedCustomer.name,
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(transactionData),
      });

      const result = await response.json();
      if (response.ok) {
        setLastReceipt({
          ...transactionData,
          invoiceNumber: result.transaction.invoiceNumber,
          createdAt: result.transaction.createdAt,
        });
        setShowSaveModal(false);
        setShowReceipt(true);
        clearCart();
        loadProducts(); // Reload untuk update stock
      } else {
        alert(result.error || result.message || 'Gagal memproses transaksi!');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Terjadi kesalahan saat menyimpan transaksi!');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      (!selectedWarehouse || product.warehouse?._id === selectedWarehouse) &&
      (!selectedSize || (product.sizeType || 'kecil') === selectedSize) &&
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  const total = calculateTotal();
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartQty = new Map(cart.map((item) => [item.product._id, item.quantity]));

  return (
    <div className="flex gap-4 h-[calc(100vh-6.5rem)] -m-2">
      {/* Left Panel - Products */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-200 space-y-2.5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Cari produk (nama atau kode barang)... tekan Enter untuk tambah jika hanya 1 hasil"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length === 1) {
                  addToCart(filteredProducts[0]);
                  setSearchQuery('');
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[{ _id: '', name: 'Semua Gudang' }, ...warehouses].map((w) => (
              <button
                key={w._id || 'all'}
                onClick={() => setSelectedWarehouse(w._id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                  selectedWarehouse === w._id
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {w._id ? '🏭 ' : ''}
                {w.name}
              </button>
            ))}
            <span className="w-px h-5 bg-gray-200 mx-1 shrink-0" aria-hidden="true" />
            {(['', ...SIZE_TYPES] as const).map((size) => (
              <button
                key={size || 'all-size'}
                onClick={() => setSelectedSize(size)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                  selectedSize === size
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {size ? SIZE_LABELS[size] : 'Semua Ukuran'}
              </button>
            ))}
            <span className="ml-auto shrink-0 text-xs text-gray-500 whitespace-nowrap pl-2">{filteredProducts.length} produk</span>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {filteredProducts.map((product) => {
              const size = product.sizeType || 'kecil';
              const inCart = cartQty.get(product._id) || 0;
              const outOfStock = product.stock <= 0;
              return (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  disabled={outOfStock}
                  className={`relative text-left p-3 rounded-xl border bg-white transition-all flex flex-col focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                    outOfStock
                      ? 'opacity-50 cursor-not-allowed border-gray-200'
                      : inCart > 0
                      ? 'border-amber-500 ring-1 ring-amber-500 shadow-sm'
                      : 'border-gray-200 hover:border-amber-400 hover:shadow-md'
                  }`}
                >
                  {inCart > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shadow">
                      {inCart}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                      {productIcon(product)}
                    </span>
                    <div className="min-w-0">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${SIZE_BADGES[size]}`}>
                        {SIZE_LABELS[size]}
                      </span>
                      <div className="text-[11px] text-gray-500 font-mono truncate mt-0.5">{product.sku}</div>
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2 min-h-10">{product.name}</div>
                  <div className="mt-auto pt-2 flex items-end justify-between gap-1">
                    <span className="font-bold text-amber-700">{formatCurrency(product.price)}</span>
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap ${
                        product.stock <= 0
                          ? 'text-red-600'
                          : product.stock <= 10
                          ? 'text-yellow-700'
                          : 'text-gray-500'
                      }`}
                    >
                      Stok {product.stock} {product.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <span className="text-5xl mb-3 block">📦</span>
              <div>Produk tidak ditemukan</div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[420px] shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cart header + customer */}
        <div className="px-4 pt-3 pb-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold text-gray-900">
              Keranjang <span className="text-gray-500 font-normal text-sm">({cart.length} produk · {totalQty} qty)</span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-600 hover:text-red-800 font-medium">
                Kosongkan
              </button>
            )}
          </div>
          <select
            value={selectedCustomer?._id || ''}
            onChange={(e) => {
              const customer = customers.find((c) => c._id === e.target.value);
              setSelectedCustomer(customer || null);
            }}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
            aria-label="Pelanggan"
          >
            <option value="">👤 Pelanggan Umum</option>
            {customers.map((customer) => (
              <option key={customer._id} value={customer._id}>
                {customer.name} - {customer.phone}
              </option>
            ))}
          </select>
          {selectedCustomer?.address && (
            <div className="text-xs text-gray-500 truncate">📍 {selectedCustomer.address}</div>
          )}
        </div>

        {/* Cart Items - compact one-line rows */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 px-6 text-center">
              <span className="text-5xl mb-3">🛒</span>
              <div className="text-sm">Keranjang kosong</div>
              <div className="text-xs mt-1">Klik produk di sebelah kiri untuk menambahkan</div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cart.map((item, idx) => (
                <li key={item.product._id} className="px-4 py-1 hover:bg-gray-50">
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-gray-400 w-4 text-right shrink-0 leading-5">{idx + 1}</span>
                    <div className="flex-1 min-w-0 text-sm font-medium text-gray-900 leading-5 truncate" title={item.product.name}>
                      {item.product.name}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product._id)}
                      className="w-5 h-5 rounded text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      aria-label={`Hapus ${item.product.name}`}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="flex-1 text-[11px] text-gray-500 truncate">
                      {formatCurrency(item.product.price)} / {item.product.unit}
                    </span>
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden shrink-0 bg-white">
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        className="w-6 h-6 hover:bg-gray-100 font-bold text-gray-700 leading-none"
                        aria-label="Kurangi"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product._id, Number(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="w-10 h-6 text-center text-sm font-semibold border-x border-gray-300 focus:outline-none focus:bg-amber-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label={`Jumlah ${item.product.name}`}
                      />
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                        className="w-6 h-6 hover:bg-gray-100 font-bold text-gray-700 leading-none"
                        aria-label="Tambah"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-24 text-right text-sm font-semibold text-gray-900 shrink-0">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Muatan</div>
              <div className="flex gap-1 text-[11px]">
                {SIZE_TYPES.map((size) => (
                  <span key={size} className={`px-1.5 py-0.5 rounded font-medium ${SIZE_BADGES[size]}`}>
                    {SIZE_LABELS[size][0]} {cartLoad[size]}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-500">Total</div>
              <div className="text-2xl font-bold text-gray-900 leading-tight">{formatCurrency(total)}</div>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
          >
            Simpan Transaksi
          </button>
        </div>
      </div>

      {/* Save Transaction Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Simpan Transaksi</h2>

            <div className="mb-4 flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Tagihan</p>
                <p className="text-3xl font-bold text-amber-600">{formatCurrency(total)}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>{selectedCustomer?.name || 'Belum pilih pelanggan'}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              Pembayaran tidak dilakukan di kasir. Tagihan dibayar saat pengiriman, dan transaksi otomatis masuk
              antrian Pengiriman.
            </div>
            {!selectedCustomer && (
              <p className="text-xs text-red-600 mb-4">⚠️ Pilih pelanggan dulu sebelum menyimpan transaksi.</p>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Jatuh Tempo (opsional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan (opsional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-medium focus:ring-4 focus:ring-gray-500/50 focus:outline-none"
              >
                Batal
              </button>
              <button
                onClick={saveTransaction}
                disabled={processing || !selectedCustomer}
                className="flex-1 py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium disabled:opacity-60 focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
              >
                {processing ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Transaksi Tersimpan!</h2>
              <p className="text-gray-600">
                Invoice: <span className="font-mono font-semibold">{lastReceipt.invoiceNumber}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">{lastReceipt.customerName}</p>
            </div>

            <div className="border-t border-b py-4 mb-4 space-y-2">
              {lastReceipt.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between text-base">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold">{formatCurrency(lastReceipt.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pembayaran:</span>
                <span>Ditagih saat pengiriman</span>
              </div>
            </div>

            <button
              onClick={() => setShowReceipt(false)}
              className="w-full py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium"
            >
              Transaksi Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
