'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';
import { formatCurrency, getRemaining } from '@/lib/distribution';

interface Item {
  productName: string;
  sku: string;
  quantity: number;
  unit?: string;
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

export default function SuratJalanPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/deliveries/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  const customerOf = (t: Transaction) => ({
    name: t.customerName || t.customer?.name || 'Pelanggan Umum',
    phone: t.customerPhone || t.customer?.phone,
    address: t.customerAddress || t.customer?.address,
  });

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white text-black">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      {/* Toolbar (not printed) */}
      <div className="print:hidden sticky top-0 bg-white border-b shadow-sm px-6 py-3 flex items-center justify-between gap-4 z-10">
        <div className="text-sm">
          <span className="font-semibold">Surat Jalan</span> · {delivery.name} · {delivery.transactions.length}{' '}
          transaksi
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
        >
          🖨️ Cetak
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto py-6 print:py-0">
        <section className="bg-white p-8 shadow print:shadow-none print:p-0">
          <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
            <div>
              <h1 className="text-xl font-bold">{COMPANY.name}</h1>
              <p className="text-xs">{COMPANY.address}</p>
              <p className="text-xs">Telp: {COMPANY.phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold tracking-wide">SURAT JALAN</h2>
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

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1 w-8">No</th>
                <th className="border border-black px-2 py-1 text-left">Invoice</th>
                <th className="border border-black px-2 py-1 text-left">Pelanggan / Alamat</th>
                <th className="border border-black px-2 py-1 text-left">Barang</th>
                <th className="border border-black px-2 py-1 text-right">Ditagih</th>
                <th className="border border-black px-2 py-1 w-20">Paraf</th>
              </tr>
            </thead>
            <tbody>
              {delivery.transactions.map((t, idx) => {
                const c = customerOf(t);
                const remaining = getRemaining(t);
                return (
                  <Fragment key={t._id}>
                    <tr className="align-top">
                      <td rowSpan={2} className="border border-black px-2 py-1 text-center">
                        {idx + 1}
                      </td>
                      <td className="border border-black px-2 py-1 font-mono text-xs whitespace-nowrap">
                        {t.invoiceNumber}
                      </td>
                      <td className="border border-black px-2 py-1">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs">
                          {c.address || '-'}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </div>
                      </td>
                      <td className="border border-black px-2 py-1 text-xs">
                        {t.items.map((item, i) => (
                          <div key={i}>
                            {item.productName} × {item.quantity} {item.unit || ''}
                          </div>
                        ))}
                      </td>
                      <td className="border border-black px-2 py-1 text-right font-semibold whitespace-nowrap">
                        {remaining > 0 ? formatCurrency(remaining) : 'LUNAS'}
                      </td>
                      <td className="border border-black px-2 py-1" />
                    </tr>
                    {/* Baris pembayaran, diisi tangan oleh driver saat menagih */}
                    <tr>
                      <td colSpan={5} className="border border-black px-2 py-1.5 text-xs">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                          <span>Dibayar: Rp ..................................</span>
                          <span>☐ Lunas</span>
                          <span>☐ Bayar Sebagian</span>
                          <span>☐ Belum Bayar</span>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="font-bold">
                <td colSpan={4} className="border border-black px-2 py-1 text-right">
                  TOTAL DITAGIH
                </td>
                <td className="border border-black px-2 py-1 text-right whitespace-nowrap">
                  {formatCurrency(delivery.summary.totalRemaining)}
                </td>
                <td className="border border-black px-2 py-1" />
              </tr>
            </tbody>
          </table>

          {delivery.notes && <p className="text-sm mt-3">Catatan: {delivery.notes}</p>}
        </section>
      </div>
    </div>
  );
}
