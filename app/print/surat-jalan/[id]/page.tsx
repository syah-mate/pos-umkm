'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';
import { SIZE_LABELS, SizeType, formatCurrency, getAmountPaid, getRemaining } from '@/lib/distribution';

interface Item {
  productName: string;
  sku: string;
  quantity: number;
  unit?: string;
  sizeType?: SizeType;
}

interface Transaction {
  _id: string;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customer?: { name?: string; phone?: string; address?: string };
  total: number;
  amountPaid?: number;
  paymentStatus?: string;
  notes?: string;
  items: Item[];
}

interface Delivery {
  _id: string;
  deliveryNumber: string;
  name: string;
  date: string;
  vehicleName: string;
  plateNumber?: string;
  driverName: string;
  notes?: string;
  transactions: Transaction[];
  summary: { totalValue: number; totalRemaining: number };
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { dateStyle: 'long' });

function Signatures({ labels }: { labels: string[] }) {
  return (
    <div className="grid gap-6 mt-8 text-center text-sm" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
      {labels.map((label) => (
        <div key={label}>
          <p>{label}</p>
          <div className="h-16" />
          <p className="border-t border-black mx-4 pt-1">(.............................)</p>
        </div>
      ))}
    </div>
  );
}

function Letterhead({ delivery, title }: { delivery: Delivery; title: string }) {
  return (
    <>
      <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">{COMPANY.name}</h1>
          <p className="text-xs">{COMPANY.address}</p>
          <p className="text-xs">Telp: {COMPANY.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold tracking-wide">{title}</h2>
          <p className="text-sm font-mono">{delivery.deliveryNumber}</p>
        </div>
      </div>
      <table className="text-sm mb-4">
        <tbody>
          <tr>
            <td className="pr-3">Tanggal</td>
            <td className="pr-8">: {formatDate(delivery.date)}</td>
            <td className="pr-3">Kendaraan</td>
            <td>
              : {delivery.vehicleName} {delivery.plateNumber ? `(${delivery.plateNumber})` : ''}
            </td>
          </tr>
          <tr>
            <td className="pr-3">Pengiriman</td>
            <td className="pr-8">: {delivery.name}</td>
            <td className="pr-3">Driver</td>
            <td>: {delivery.driverName}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function SuratJalanPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState('');
  const [perCustomer, setPerCustomer] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/deliveries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (response.ok) setDelivery(data.delivery);
        else setError(data.error || 'Gagal memuat data');
      } catch {
        setError('Gagal memuat data');
      }
    };
    load();
  }, [id]);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!delivery) return <div className="p-8">Loading...</div>;

  // Rekap muatan per produk untuk bagian gudang
  const manifest = new Map<string, { item: Item; qty: number }>();
  for (const t of delivery.transactions) {
    for (const item of t.items) {
      const key = item.sku || item.productName;
      const row = manifest.get(key);
      if (row) row.qty += item.quantity;
      else manifest.set(key, { item, qty: item.quantity });
    }
  }
  const manifestRows = [...manifest.values()].sort((a, b) => a.item.productName.localeCompare(b.item.productName));

  const customerOf = (t: Transaction) => ({
    name: t.customerName || t.customer?.name || 'Pelanggan Umum',
    phone: t.customerPhone || t.customer?.phone,
    address: t.customerAddress || t.customer?.address,
  });

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print { .page-break { break-before: page; } }
      `}</style>

      {/* Toolbar (not printed) */}
      <div className="print:hidden sticky top-0 bg-white border-b shadow-sm px-6 py-3 flex items-center justify-between gap-4 z-10">
        <div className="text-sm">
          <span className="font-semibold">Surat Jalan</span> · {delivery.name} · {delivery.transactions.length} transaksi
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={perCustomer}
              onChange={(e) => setPerCustomer(e.target.checked)}
              className="accent-amber-600"
            />
            1 halaman per pelanggan
          </label>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
          >
            🖨️ Cetak
          </button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto py-6 print:py-0 space-y-6 print:space-y-0">
        {/* Page 1: rekap muatan + daftar tujuan */}
        <section className="bg-white p-8 shadow print:shadow-none print:p-0">
          <Letterhead delivery={delivery} title="SURAT JALAN" />

          <h3 className="font-bold text-sm mb-2">A. Rekap Muatan</h3>
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1 w-10">No</th>
                <th className="border border-black px-2 py-1 text-left">Kode</th>
                <th className="border border-black px-2 py-1 text-left">Nama Barang</th>
                <th className="border border-black px-2 py-1">Ukuran</th>
                <th className="border border-black px-2 py-1 text-right">Qty</th>
                <th className="border border-black px-2 py-1">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {manifestRows.map(({ item, qty }, idx) => (
                <tr key={item.sku || item.productName}>
                  <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-black px-2 py-1 font-mono text-xs">{item.sku}</td>
                  <td className="border border-black px-2 py-1">{item.productName}</td>
                  <td className="border border-black px-2 py-1 text-center">{item.sizeType ? SIZE_LABELS[item.sizeType] : '-'}</td>
                  <td className="border border-black px-2 py-1 text-right font-semibold">{qty}</td>
                  <td className="border border-black px-2 py-1 text-center">{item.unit || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-bold text-sm mb-2">B. Daftar Tujuan</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1 w-10">No</th>
                <th className="border border-black px-2 py-1 text-left">Invoice</th>
                <th className="border border-black px-2 py-1 text-left">Pelanggan / Alamat</th>
                <th className="border border-black px-2 py-1 text-right">Total</th>
                <th className="border border-black px-2 py-1 text-right">Ditagih</th>
                <th className="border border-black px-2 py-1 w-24">Paraf</th>
              </tr>
            </thead>
            <tbody>
              {delivery.transactions.map((t, idx) => {
                const c = customerOf(t);
                return (
                  <tr key={t._id}>
                    <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border border-black px-2 py-1 font-mono text-xs whitespace-nowrap">{t.invoiceNumber}</td>
                    <td className="border border-black px-2 py-1">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs">{c.address || '-'}{c.phone ? ` · ${c.phone}` : ''}</div>
                    </td>
                    <td className="border border-black px-2 py-1 text-right">{formatCurrency(t.total)}</td>
                    <td className="border border-black px-2 py-1 text-right font-semibold">
                      {getRemaining(t) > 0 ? formatCurrency(getRemaining(t)) : 'LUNAS'}
                    </td>
                    <td className="border border-black px-2 py-1" />
                  </tr>
                );
              })}
              <tr className="font-bold">
                <td colSpan={3} className="border border-black px-2 py-1 text-right">TOTAL</td>
                <td className="border border-black px-2 py-1 text-right">{formatCurrency(delivery.summary.totalValue)}</td>
                <td className="border border-black px-2 py-1 text-right">{formatCurrency(delivery.summary.totalRemaining)}</td>
                <td className="border border-black px-2 py-1" />
              </tr>
            </tbody>
          </table>

          {delivery.notes && <p className="text-sm mt-3">Catatan: {delivery.notes}</p>}

          <Signatures labels={['Bagian Gudang', 'Driver', 'Mengetahui']} />
        </section>

        {/* Per-customer delivery notes, signed by each toko */}
        {perCustomer &&
          delivery.transactions.map((t, idx) => {
            const c = customerOf(t);
            const remaining = getRemaining(t);
            return (
              <section key={t._id} className="page-break bg-white p-8 shadow print:shadow-none print:p-0">
                <Letterhead delivery={delivery} title="SURAT JALAN" />

                <div className="flex justify-between text-sm mb-4 gap-6">
                  <div>
                    <p className="text-xs text-gray-600">Kepada Yth.</p>
                    <p className="font-bold">{c.name}</p>
                    <p>{c.address || '-'}</p>
                    {c.phone && <p>Telp: {c.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p>
                      Invoice: <span className="font-mono font-semibold">{t.invoiceNumber}</span>
                    </p>
                    <p>
                      Tujuan ke-{idx + 1} dari {delivery.transactions.length}
                    </p>
                  </div>
                </div>

                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 w-10">No</th>
                      <th className="border border-black px-2 py-1 text-left">Kode</th>
                      <th className="border border-black px-2 py-1 text-left">Nama Barang</th>
                      <th className="border border-black px-2 py-1 text-right">Qty</th>
                      <th className="border border-black px-2 py-1">Satuan</th>
                      <th className="border border-black px-2 py-1 w-28">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.items.map((item, i) => (
                      <tr key={i}>
                        <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
                        <td className="border border-black px-2 py-1 font-mono text-xs">{item.sku}</td>
                        <td className="border border-black px-2 py-1">{item.productName}</td>
                        <td className="border border-black px-2 py-1 text-right font-semibold">{item.quantity}</td>
                        <td className="border border-black px-2 py-1 text-center">{item.unit || ''}</td>
                        <td className="border border-black px-2 py-1" />
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table className="text-sm ml-auto mb-2">
                  <tbody>
                    <tr>
                      <td className="pr-6">Total Tagihan</td>
                      <td className="text-right">{formatCurrency(t.total)}</td>
                    </tr>
                    <tr>
                      <td className="pr-6">Sudah Dibayar</td>
                      <td className="text-right">{formatCurrency(getAmountPaid(t))}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="pr-6">Sisa Pembayaran</td>
                      <td className="text-right">{remaining > 0 ? formatCurrency(remaining) : 'LUNAS'}</td>
                    </tr>
                  </tbody>
                </table>

                {t.notes && <p className="text-sm">Catatan: {t.notes}</p>}
                <p className="text-xs mt-2">
                  Barang telah diterima dalam keadaan baik dan jumlah yang sesuai.
                </p>

                <Signatures labels={['Penerima', 'Driver', 'Hormat Kami']} />
              </section>
            );
          })}
      </div>
    </div>
  );
}
