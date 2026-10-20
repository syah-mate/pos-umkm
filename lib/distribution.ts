// Shared constants & helpers for the distributor flow (safe to import from client and server)

export type SizeType = 'besar' | 'medium' | 'kecil';

export const SIZE_TYPES: SizeType[] = ['besar', 'medium', 'kecil'];

export const SIZE_LABELS: Record<SizeType, string> = {
  besar: 'Besar',
  medium: 'Medium',
  kecil: 'Kecil',
};

export const SIZE_BADGES: Record<SizeType, string> = {
  besar: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  kecil: 'bg-sky-100 text-sky-700',
};

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Lunas',
  partial: 'Bayar Sebagian',
  unpaid: 'Hutang',
  pending: 'Hutang',
  refunded: 'Refund',
  failed: 'Gagal',
};

export const PAYMENT_STATUS_BADGES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-800',
  unpaid: 'bg-red-100 text-red-700',
  pending: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
  failed: 'bg-gray-100 text-gray-700',
};

// Transaksi yang sudah masuk catatan pengiriman dianggap terkirim
// (scheduled / on_delivery hanya ada di data lama)
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Belum Dikirim',
  scheduled: 'Terkirim',
  on_delivery: 'Terkirim',
  delivered: 'Terkirim',
  not_required: 'Ambil Sendiri',
};

export const DELIVERY_STATUS_BADGES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-green-100 text-green-700',
  on_delivery: 'bg-green-100 text-green-700',
  delivered: 'bg-green-100 text-green-700',
  not_required: 'bg-stone-100 text-stone-700',
};

export const EXPENSE_CATEGORIES = ['bensin', 'tol', 'parkir', 'makan', 'bongkar muat', 'lainnya'];

export const PAYMENT_METHODS = ['cash', 'transfer', 'qris', 'debit'];

export interface Load {
  besar: number;
  medium: number;
  kecil: number;
}

export function emptyLoad(): Load {
  return { besar: 0, medium: 0, kecil: 0 };
}

export function addLoad(a: Load, b: Load): Load {
  return { besar: a.besar + b.besar, medium: a.medium + b.medium, kecil: a.kecil + b.kecil };
}

/** Count items per size type. Items without a size type are treated as 'kecil'. */
export function loadOfItems(items: { quantity: number; sizeType?: string }[]): Load {
  const load = emptyLoad();
  for (const item of items) {
    const size = (SIZE_TYPES as string[]).includes(item.sizeType || '')
      ? (item.sizeType as SizeType)
      : 'kecil';
    load[size] += item.quantity;
  }
  return load;
}

/** Returns the size types whose load exceeds the capacity. */
export function overCapacity(load: Load, capacity: Load): SizeType[] {
  return SIZE_TYPES.filter((s) => load[s] > (capacity[s] || 0));
}

/** Amount already paid; legacy transactions without amountPaid count as fully paid when status is 'paid'. */
export function getAmountPaid(t: { total: number; amountPaid?: number; paymentStatus?: string }): number {
  if (typeof t.amountPaid === 'number') return t.amountPaid;
  return t.paymentStatus === 'paid' ? t.total : 0;
}

export function getRemaining(t: { total: number; amountPaid?: number; paymentStatus?: string }): number {
  return Math.max(0, t.total - getAmountPaid(t));
}

export function computePaymentStatus(total: number, amountPaid: number): PaymentStatus {
  if (amountPaid >= total) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'unpaid';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatNumberWithDots(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
