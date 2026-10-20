import Delivery from '@/models/Delivery';
import Product from '@/models/Product';
import type { ITransaction, ITransactionItem } from '@/models/Transaction';

export interface DeliveryProfitTransaction {
  invoiceNumber: string;
  customerName: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
}

export interface DeliveryProfitRow {
  _id: string;
  deliveryNumber: string;
  name: string;
  vehicleName: string;
  plateNumber?: string;
  driverName: string;
  transactionCount: number;
  revenue: number;
  hpp: number;
  expenses: number;
  profit: number;
  transactions: DeliveryProfitTransaction[];
}

export interface DeliveryProfitReport {
  date: string;
  deliveries: DeliveryProfitRow[];
  totals: {
    deliveryCount: number;
    transactionCount: number;
    revenue: number;
    hpp: number;
    expenses: number;
    profit: number;
  };
}

/**
 * Laba per pengiriman pada satu tanggal:
 * pendapatan (nilai transaksi) - HPP (qty × harga modal) - pengeluaran pengiriman.
 */
export async function buildDeliveryProfitReport(date: string): Promise<DeliveryProfitReport> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const deliveries = await Delivery.find({ date: { $gte: start, $lte: end } })
    .populate('transactions', 'invoiceNumber customerName items total')
    .sort({ date: 1, deliveryNumber: 1 });

  // Transaksi lama belum punya snapshot HPP → pakai harga modal produk saat ini
  const missingCost = new Set<string>();
  for (const d of deliveries) {
    for (const t of d.transactions as unknown as (ITransaction | null)[]) {
      for (const item of t?.items || []) {
        if (item.cost === undefined || item.cost === null) missingCost.add(String(item.product));
      }
    }
  }
  const products = missingCost.size
    ? await Product.find({ _id: { $in: Array.from(missingCost) } }).select('cost')
    : [];
  const currentCost = new Map(products.map((p) => [String(p._id), p.cost || 0]));

  const rows: DeliveryProfitRow[] = deliveries.map((d) => {
    const transactions: DeliveryProfitTransaction[] = (d.transactions as unknown as (ITransaction | null)[])
      .filter((t): t is ITransaction => !!t && t.total !== undefined)
      .map((t) => {
        const hpp = (t.items || []).reduce((sum: number, item: ITransactionItem) => {
          const cost = item.cost ?? currentCost.get(String(item.product)) ?? 0;
          return sum + cost * item.quantity;
        }, 0);
        return {
          invoiceNumber: t.invoiceNumber,
          customerName: t.customerName || '-',
          revenue: t.total,
          hpp,
          grossProfit: t.total - hpp,
        };
      });

    const revenue = transactions.reduce((sum, t) => sum + t.revenue, 0);
    const hpp = transactions.reduce((sum, t) => sum + t.hpp, 0);
    const expenses = (d.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      _id: String(d._id),
      deliveryNumber: d.deliveryNumber,
      name: d.name,
      vehicleName: d.vehicleName,
      plateNumber: d.plateNumber,
      driverName: d.driverName,
      transactionCount: transactions.length,
      revenue,
      hpp,
      expenses,
      profit: revenue - hpp - expenses,
      transactions,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      deliveryCount: acc.deliveryCount + 1,
      transactionCount: acc.transactionCount + r.transactionCount,
      revenue: acc.revenue + r.revenue,
      hpp: acc.hpp + r.hpp,
      expenses: acc.expenses + r.expenses,
      profit: acc.profit + r.profit,
    }),
    { deliveryCount: 0, transactionCount: 0, revenue: 0, hpp: 0, expenses: 0, profit: 0 }
  );

  return { date, deliveries: rows, totals };
}
