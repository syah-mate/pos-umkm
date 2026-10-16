'use client';

import { useState } from 'react';
import { EXPENSE_CATEGORIES, formatCurrency, formatNumberWithDots } from '@/lib/distribution';

export interface DeliveryExpense {
  _id: string;
  category: string;
  description?: string;
  amount: number;
  date: string;
  createdByName?: string;
}

interface Props {
  deliveryId: string;
  deliveryLabel: string;
  expenses: DeliveryExpense[];
  readOnly?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function ExpenseModal({ deliveryId, deliveryLabel, expenses, readOnly, onClose, onChanged }: Props) {
  const [category, setCategory] = useState('bensin');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${deliveryId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, description: description || undefined, amount }),
      });
      const result = await response.json();
      if (response.ok) {
        setDescription('');
        setAmount(0);
        onChanged();
      } else {
        alert(result.error || 'Gagal menambahkan pengeluaran!');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Terjadi kesalahan!');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: DeliveryExpense) => {
    if (!confirm(`Hapus pengeluaran ${expense.category} ${formatCurrency(expense.amount)}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${deliveryId}/expenses?expenseId=${expense._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        onChanged();
      } else {
        const result = await response.json();
        alert(result.error || 'Gagal menghapus pengeluaran!');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Terjadi kesalahan!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Klaim Pengeluaran</h2>
            <p className="text-sm text-gray-600">{deliveryLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label="Tutup">
            ✕
          </button>
        </div>

        <div className="border rounded-lg divide-y mb-4">
          {expenses.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-500">Belum ada pengeluaran</p>}
          {expenses.map((e) => (
            <div key={e._id} className="px-4 py-2 flex justify-between items-center gap-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900 capitalize">{e.category}</div>
                <div className="text-xs text-gray-500">
                  {new Date(e.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  {e.description ? ` · ${e.description}` : ''}
                  {e.createdByName ? ` · ${e.createdByName}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{formatCurrency(e.amount)}</span>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(e)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    aria-label="Hapus pengeluaran"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
          {expenses.length > 0 && (
            <div className="px-4 py-2 flex justify-between bg-gray-50 font-semibold text-sm">
              <span>Total Pengeluaran</span>
              <span className="text-red-600">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        {!readOnly && (
          <form onSubmit={handleAdd} className="space-y-3 p-4 bg-amber-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-800">Tambah Pengeluaran</p>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    category === c ? 'bg-amber-600 text-white' : 'bg-white text-gray-800 border border-gray-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount ? formatNumberWithDots(amount) : ''}
                  onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                  placeholder="Nominal"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : '+ Tambah'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
