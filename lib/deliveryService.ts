import Delivery from '@/models/Delivery';
import Transaction from '@/models/Transaction';
import {
  Load,
  SIZE_LABELS,
  addLoad,
  emptyLoad,
  getAmountPaid,
  loadOfItems,
  overCapacity,
} from '@/lib/distribution';

export const TRANSACTION_FIELDS =
  'invoiceNumber customer customerName customerPhone customerAddress items total amountPaid paymentStatus payments deliveryStatus dueDate createdAt notes';

export async function generateDeliveryNumber(date: Date): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `DLV-${dateStr}-`;
  const last = await Delivery.findOne({ deliveryNumber: { $regex: `^${prefix}` } })
    .sort({ deliveryNumber: -1 })
    .select('deliveryNumber');
  const next = last ? Number(last.deliveryNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Validates that transactions can be loaded into a delivery and fit the vehicle.
 * Returns an error message, or the total load when valid.
 */
export async function validateDeliveryTransactions(
  transactionIds: string[],
  capacity: Load,
  currentDeliveryId?: string
): Promise<{ error: string } | { load: Load }> {
  if (!transactionIds || transactionIds.length === 0) {
    return { error: 'Pilih minimal 1 transaksi untuk dikirim' };
  }

  const transactions = await Transaction.find({ _id: { $in: transactionIds } });
  if (transactions.length !== new Set(transactionIds.map(String)).size) {
    return { error: 'Sebagian transaksi tidak ditemukan' };
  }

  let load = emptyLoad();
  for (const t of transactions) {
    const inThisDelivery = currentDeliveryId && String(t.delivery) === String(currentDeliveryId);
    if (!inThisDelivery && t.deliveryStatus !== 'pending') {
      return { error: `Transaksi ${t.invoiceNumber} sudah masuk pengiriman lain atau tidak perlu dikirim` };
    }
    load = addLoad(load, loadOfItems(t.items));
  }

  const over = overCapacity(load, capacity);
  if (over.length > 0) {
    const detail = over
      .map((s) => `${SIZE_LABELS[s]} ${load[s]}/${capacity[s] || 0}`)
      .join(', ');
    return { error: `Muatan melebihi kapasitas kendaraan (${detail})` };
  }

  return { load };
}

/** Adds computed totals (nilai, terbayar, sisa, pengeluaran, muatan) to a populated delivery. */
export function summarizeDelivery(delivery: any) {
  const d = typeof delivery.toObject === 'function' ? delivery.toObject() : delivery;
  const transactions: any[] = (d.transactions || []).filter((t: any) => t && t.total !== undefined);

  let load = emptyLoad();
  let totalValue = 0;
  let totalPaid = 0;
  let collected = 0;
  const counts = { paid: 0, partial: 0, unpaid: 0 };

  for (const t of transactions) {
    const paid = getAmountPaid(t);
    // Uang yang ditagih driver selama pengiriman ini (untuk setoran)
    for (const p of t.payments || []) {
      if (p.delivery && String(p.delivery) === String(d._id)) collected += p.amount;
    }
    totalValue += t.total;
    totalPaid += paid;
    if (paid >= t.total) counts.paid += 1;
    else if (paid > 0) counts.partial += 1;
    else counts.unpaid += 1;
    load = addLoad(load, loadOfItems(t.items || []));
  }

  const totalExpenses = (d.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  return {
    ...d,
    summary: {
      transactionCount: transactions.length,
      totalValue,
      totalPaid,
      totalRemaining: totalValue - totalPaid,
      totalExpenses,
      collected,
      netDeposit: collected - totalExpenses,
      counts,
      load,
    },
  };
}
