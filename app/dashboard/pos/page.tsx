'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  _id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  category: { name: string };
  unit: string;
  image?: string;
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
}

interface Shift {
  _id: string;
  shiftName: string;
  cashierName: string;
  startTime: string;
  status: 'open' | 'closed';
}

export default function POSPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState(0);
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
    loadCategories();
    loadCustomers();
    loadActiveShift();
  }, []);

  const loadActiveShift = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/shifts?status=open', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const shifts = data.data || [];
        setActiveShift(shifts.length > 0 ? shifts[0] : null);
      }
    } catch (error) {
      console.error('Error loading active shift:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      // Filter produk hanya dari kategori 'product', bukan 'ingredient'
      let url = '/api/products?categoryType=product';
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Products loaded in POS:', data);
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
        // Filter hanya kategori produk jual (bukan bahan baku)
        const allCategories = data.categories || data.data || [];
        const productCategories = allCategories.filter((cat: any) => cat.type !== 'ingredient');
        setCategories(productCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || data.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const addToCart = (product: Product) => {
    if (!activeShift) {
      alert('Tidak ada shift aktif! Silakan buka shift terlebih dahulu.');
      return;
    }

    if (product.stock <= 0) {
      alert('Stok produk habis!');
      return;
    }

    const existingItem = cart.find(item => item.product._id === product._id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Stok tidak mencukupi!');
        return;
      }
      updateQuantity(product._id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        subtotal: product.price,
      }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = cart.find(item => item.product._id === productId)?.product;
    if (product && newQuantity > product.stock) {
      alert('Stok tidak mencukupi!');
      return;
    }

    setCart(cart.map(item => 
      item.product._id === productId
        ? { ...item, quantity: newQuantity, subtotal: item.product.price * newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang kosong!');
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    const total = calculateTotal();
    
    if (paymentMethod === 'cash' && cashReceived < total) {
      alert('Uang yang diterima kurang!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const transactionData = {
        items: cart.map(item => ({
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
        total: total,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived : total,
        change: paymentMethod === 'cash' ? cashReceived - total : 0,
        cashier: user.id || user._id,
        cashierName: user.name,
        customer: selectedCustomer?._id,
        customerName: selectedCustomer?.name,
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        const result = await response.json();
        setLastReceipt({
          ...transactionData,
          invoiceNumber: result.transaction.invoiceNumber,
          createdAt: result.transaction.createdAt,
        });
        setShowPaymentModal(false);
        setShowReceipt(true);
        clearCart();
        loadProducts(); // Reload untuk update stock
      } else {
        const error = await response.json();
        alert(error.message || 'Gagal memproses transaksi!');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Terjadi kesalahan saat memproses pembayaran!');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-md overflow-hidden">
        {/* Shift Status Banner */}
        <div className={`p-4 border-b ${activeShift ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeShift ? '✅' : '🔒'}</span>
              <div>
                <h3 className={`font-bold ${activeShift ? 'text-green-800' : 'text-red-800'}`}>
                  Status Shift: {activeShift ? 'Buka' : 'Tutup'}
                </h3>
                <p className={`text-sm ${activeShift ? 'text-green-600' : 'text-red-600'}`}>
                  {activeShift ? (
                    <>
                      Kasir: <span className="font-semibold">{activeShift.cashierName}</span> | 
                      Dibuka: <span className="font-semibold">
                        {new Date(activeShift.startTime).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  ) : (
                    <>Kasir: - | Dibuka: -</>
                  )}
                </p>
                {!activeShift && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ Produk tidak dapat dipilih. Silakan buka shift terlebih dahulu.
                  </p>
                )}
              </div>
            </div>
            {!activeShift && (
              <button
                onClick={() => router.push('/dashboard/shifts')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                Buka Shift
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="p-4 border-b bg-gray-50">
          <input
            type="text"
            placeholder="🔍 Cari produk (nama atau SKU)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
          />
          
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap focus:ring-4 focus:ring-amber-400/50 focus:outline-none ${
                selectedCategory === ''
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              Semua
            </button>
            {categories.map(category => (
              <button
                key={category._id}
                onClick={() => setSelectedCategory(category._id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap focus:ring-4 focus:ring-amber-400/50 focus:outline-none ${
                  selectedCategory === category._id
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                disabled={!activeShift || product.stock <= 0}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  !activeShift || product.stock <= 0
                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    : 'bg-white border-gray-200 hover:border-amber-500 hover:shadow-lg'
                }`}
              >
                <div className="h-32 bg-linear-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{product.sku}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-amber-600">
                    {formatCurrency(product.price)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.stock > 10
                        ? 'bg-green-100 text-green-700'
                        : product.stock > 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {product.stock} {product.unit}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">📦</span>
              <p>Produk tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 flex flex-col bg-white rounded-xl shadow-md overflow-hidden">
        {/* Cart Header */}
        <div className="bg-linear-to-r from-amber-600 to-amber-700 p-4 text-white">
          <h2 className="text-xl font-bold">Keranjang</h2>
          <p className="text-sm text-amber-100">{cart.length} item</p>
        </div>

        {/* Customer Selection */}
        <div className="p-4 border-b bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pelanggan (Opsional)
          </label>
          <select
            value={selectedCustomer?._id || ''}
            onChange={(e) => {
              const customer = customers.find(c => c._id === e.target.value);
              setSelectedCustomer(customer || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
          >
            <option value="">Pelanggan Umum</option>
            {customers.map(customer => (
              <option key={customer._id} value={customer._id}>
                {customer.name} - {customer.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-6xl mb-4 block">🛒</span>
              <p>Keranjang kosong</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div
                  key={item.product._id}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800 flex-1">
                      {item.product.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.product._id)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {formatCurrency(item.product.price)} × {item.quantity}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        className="w-8 h-8 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-bold"
                      >
                        −
                      </button>
                      <span className="w-12 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                        className="w-8 h-8 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-bold"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-amber-600">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(calculateTotal())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-amber-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="flex-1 py-3 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg font-medium transition-colors focus:ring-4 focus:ring-red-500/50 focus:outline-none"
                aria-label="Clear cart"
              >
                Bersihkan
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium transition-colors focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
              >
                Bayar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Pembayaran</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Total Pembayaran</p>
              <p className="text-3xl font-bold text-amber-600">
                {formatCurrency(calculateTotal())}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'qris', 'debit'].map(method => (
                  <button
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== 'cash') {
                        setCashReceived(calculateTotal());
                      } else {
                        setCashReceived(0);
                      }
                    }}
                    className={`py-3 rounded-lg font-medium focus:ring-4 focus:ring-amber-400/50 focus:outline-none ${
                      paymentMethod === method
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {method.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uang Diterima
                  </label>
                  <input
                    type="number"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                {cashReceived >= calculateTotal() && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Kembalian</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(cashReceived - calculateTotal())}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-medium focus:ring-4 focus:ring-gray-500/50 focus:outline-none"
              >
                Batal
              </button>
              <button
                onClick={processPayment}
                className="flex-1 py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
              >
                Proses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Pembayaran Berhasil!
              </h2>
              <p className="text-gray-600">
                Invoice: <span className="font-mono font-semibold">{lastReceipt.invoiceNumber}</span>
              </p>
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

            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold">{formatCurrency(lastReceipt.total)}</span>
              </div>
              {paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bayar:</span>
                    <span>{formatCurrency(lastReceipt.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kembalian:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(lastReceipt.change)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Metode:</span>
                <span className="uppercase font-medium">{lastReceipt.paymentMethod}</span>
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
