'use client';

import { useEffect, useState } from 'react';
import PaymentModal from '@/components/PaymentModal';
import {
  DELIVERY_STATUS_BADGES,
  DELIVERY_STATUS_LABELS,
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
  getAmountPaid,
  getRemaining,
} from '@/lib/distribution';

interface TransactionItem {
  product: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

interface Transaction {
  _id: string;
  invoiceNumber: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  amountPaid?: number;
  payments?: { amount: number; method: string; date: string; notes?: string; receivedByName?: string }[];
  deliveryStatus?: string;
  dueDate?: string;
  cashReceived?: number;
  change?: number;
  customer?: { name: string; phone: string };
  customerName?: string;
  cashier: { name: string } | string;
  cashierName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paying, setPaying] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Set default dates: 30 days ago to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    setStartDate(thirtyDaysAgoStr);
    setEndDate(todayStr);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadTransactions();
    }
  }, [startDate, endDate, paymentMethod, paymentStatus]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/transactions?';
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (paymentMethod) url += `paymentMethod=${paymentMethod}&`;
      if (paymentStatus) url += `paymentStatus=${paymentStatus}&`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const query = searchQuery.toLowerCase();
    return (
      transaction.invoiceNumber.toLowerCase().includes(query) ||
      transaction.cashierName.toLowerCase().includes(query) ||
      transaction.customerName?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges: any = {
      cash: 'bg-green-100 text-green-700',
      qris: 'bg-blue-100 text-blue-700',
      debit: 'bg-purple-100 text-purple-700',
      credit: 'bg-pink-100 text-pink-700',
      'e-wallet': 'bg-orange-100 text-orange-700',
    };
    return badges[method] || 'bg-gray-100 text-gray-700';
  };

  const getTotalSales = () => {
    return filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  };

  const getTotalTransactions = () => {
    return filteredTransactions.length;
  };

  const viewDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <p className="text-gray-600 text-sm mb-4">Kelola dan pantau semua transaksi penjualan</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Transaksi</p>
              <p className="text-3xl font-bold text-gray-800">{getTotalTransactions()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🧾</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Penjualan</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalSales())}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rata-rata Transaksi</p>
              <p className="text-2xl font-bold text-amber-600">
                {getTotalTransactions() > 0 
                  ? formatCurrency(getTotalSales() / getTotalTransactions()) 
                  : formatCurrency(0)
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">Semua Metode</option>
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
              <option value="e-wallet">E-Wallet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Bayar
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="outstanding">Belum Lunas</option>
              <option value="paid">Lunas</option>
              <option value="partial">Bayar Sebagian</option>
              <option value="unpaid">Hutang</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Transaksi
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Invoice, kasir, pelanggan..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tanggal & Waktu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kasir
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pembayaran
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map(transaction => (
                <tr key={transaction._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-mono text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {transaction.invoiceNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {formatDateTime(transaction.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-semibold text-gray-900">{transaction.cashierName}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {transaction.customerName || 'Pelanggan Umum'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap">
                      {transaction.items.length} item
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getPaymentMethodBadge(transaction.paymentMethod)}`}>
                      {transaction.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-green-600 whitespace-nowrap">
                    {formatCurrency(transaction.total)}
                    {getRemaining(transaction) > 0 && (
                      <div className="text-xs font-medium text-red-600">sisa {formatCurrency(getRemaining(transaction))}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${PAYMENT_STATUS_BADGES[transaction.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {PAYMENT_STATUS_LABELS[transaction.paymentStatus] || transaction.paymentStatus}
                      </span>
                      {transaction.deliveryStatus && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${DELIVERY_STATUS_BADGES[transaction.deliveryStatus]}`}>
                          {DELIVERY_STATUS_LABELS[transaction.deliveryStatus]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => viewDetail(transaction)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Detail
                      </button>
                      {getRemaining(transaction) > 0 && (
                        <button
                          onClick={() => setPaying(transaction)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          Bayar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">📋</span>
              <p>Tidak ada transaksi ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Detail Transaksi</h2>
                <p className="text-gray-600 font-mono text-sm mt-1">
                  {selectedTransaction.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Transaction Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Tanggal & Waktu</p>
                <p className="font-semibold">{formatDateTime(selectedTransaction.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Kasir</p>
                <p className="font-semibold">{selectedTransaction.cashierName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pelanggan</p>
                <p className="font-semibold">{selectedTransaction.customerName || 'Pelanggan Umum'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Metode Pembayaran</p>
                <p className="font-semibold uppercase">{selectedTransaction.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_BADGES[selectedTransaction.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                  {PAYMENT_STATUS_LABELS[selectedTransaction.paymentStatus] || selectedTransaction.paymentStatus}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-800 mb-3">Item Produk</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produk</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Harga</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedTransaction.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm font-semibold">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{item.sku}</td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-2 text-sm text-center font-semibold">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(selectedTransaction.subtotal)}</span>
              </div>
              {selectedTransaction.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pajak:</span>
                  <span className="font-semibold">{formatCurrency(selectedTransaction.tax)}</span>
                </div>
              )}
              {selectedTransaction.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Diskon:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(selectedTransaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(selectedTransaction.total)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Terbayar:</span>
                <span className="font-semibold">{formatCurrency(getAmountPaid(selectedTransaction))}</span>
              </div>
              {getRemaining(selectedTransaction) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sisa Tagihan:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(getRemaining(selectedTransaction))}</span>
                </div>
              )}

              {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Riwayat Pembayaran</p>
                  <div className="border rounded-lg divide-y text-xs">
                    {selectedTransaction.payments.map((p, idx) => (
                      <div key={idx} className="px-3 py-1.5 flex justify-between">
                        <span className="text-gray-600">
                          {formatDateTime(p.date)} · {p.method.toUpperCase()}
                          {p.receivedByName ? ` · ${p.receivedByName}` : ''}
                          {p.notes ? ` · ${p.notes}` : ''}
                        </span>
                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.paymentStatus === 'paid' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uang Diterima:</span>
                    <span className="font-semibold">{formatCurrency(selectedTransaction.cashReceived || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kembalian:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(selectedTransaction.change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {selectedTransaction.notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Catatan:</p>
                <p className="text-sm">{selectedTransaction.notes}</p>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full py-3 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {paying && (
        <PaymentModal
          transaction={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            loadTransactions();
          }}
        />
      )}
    </div>
  );
}
