'use client';

import { useState } from 'react';
import {
  PAYMENT_METHODS,
  formatCurrency,
  formatNumberWithDots,
  getAmountPaid,
  getRemaining,
} from '@/lib/distribution';

export interface PayableTransaction {
  _id: string;
  invoiceNumber: string;
  customerName?: string;
  total: number;
  amountPaid?: number;
  paymentStatus?: string;
  payments?: { amount: number; method: string; date: string; notes?: string; receivedByName?: string }[];
}

interface Props {
  transaction: PayableTransaction;
  deliveryId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentModal({ transaction, deliveryId, onClose, onSaved }: Props) {
  const remaining = getRemaining(transaction);
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > remaining) {
      alert('Nominal harus lebih dari 0 dan tidak melebihi sisa tagihan.');
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/transactions/${transaction._id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, method, notes: notes || undefined, deliveryId }),
      });
      const result = await response.json();
      if (response.ok) {
        onSaved();
      } else {
        alert(result.error || 'Gagal mencatat pembayaran!');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Terjadi kesalahan!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800">Pelunasan</h2>
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-mono font-semibold">{transaction.invoiceNumber}</span> ·{' '}
          {transaction.customerName || 'Pelanggan Umum'}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Total</p>
            <p className="font-semibold text-sm">{formatCurrency(transaction.total)}</p>
          </div>
          <div className="p-2 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600">Terbayar</p>
            <p className="font-semibold text-sm text-green-700">{formatCurrency(getAmountPaid(transaction))}</p>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-600">Sisa</p>
            <p className="font-semibold text-sm text-red-700">{formatCurrency(remaining)}</p>
          </div>
        </div>

        {transaction.payments && transaction.payments.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Riwayat Pembayaran</p>
            <div className="border rounded-lg divide-y text-xs">
              {transaction.payments.map((p, idx) => (
                <div key={idx} className="px-3 py-1.5 flex justify-between">
                  <span className="text-gray-600">
                    {new Date(p.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })} · {p.method.toUpperCase()}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </span>
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Nominal Diterima</label>
              <button
                type="button"
                onClick={() => setAmount(remaining)}
                className="text-xs text-amber-700 hover:underline"
              >
                Lunasi semua
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount ? formatNumberWithDots(amount) : ''}
                onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>
            {amount > 0 && amount < remaining && (
              <p className="text-xs text-yellow-700 mt-1">
                Bayar sebagian — sisa setelah ini {formatCurrency(remaining - amount)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metode</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-2 rounded-lg text-xs font-medium ${
                    method === m ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
