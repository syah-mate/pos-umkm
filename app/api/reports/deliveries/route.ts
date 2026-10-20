import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import dbConnect from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import { buildDeliveryProfitReport } from '@/lib/deliveryReport';

// GET laporan laba pengiriman harian (?date=YYYY-MM-DD, &format=xlsx untuk download Excel)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const report = await buildDeliveryProfitReport(date);

    if (searchParams.get('format') !== 'xlsx') {
      return NextResponse.json({ data: report }, { status: 200 });
    }

    const workbook = new ExcelJS.Workbook();
    const currencyFmt = '#,##0';
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Sheet 1: ringkasan per pengiriman
    const summary = workbook.addWorksheet('Laba Pengiriman');
    summary.addRow([`Laporan Laba Pengiriman - ${date}`]).font = { bold: true, size: 14 };
    summary.addRow([`Jumlah pengiriman: ${report.totals.deliveryCount}`]);
    summary.addRow([]);

    const header = summary.addRow([
      'No',
      'No. Pengiriman',
      'Nama',
      'Kendaraan',
      'Plat',
      'Driver',
      'Transaksi',
      'Pendapatan',
      'HPP',
      'Pengeluaran',
      'Keuntungan',
    ]);
    header.font = { bold: true };
    header.eachCell((cell) => (cell.fill = headerFill));

    report.deliveries.forEach((d, idx) => {
      summary.addRow([
        idx + 1,
        d.deliveryNumber,
        d.name,
        d.vehicleName,
        d.plateNumber || '',
        d.driverName,
        d.transactionCount,
        d.revenue,
        d.hpp,
        d.expenses,
        d.profit,
      ]);
    });

    const totalRow = summary.addRow([
      '',
      'TOTAL',
      '',
      '',
      '',
      '',
      report.totals.transactionCount,
      report.totals.revenue,
      report.totals.hpp,
      report.totals.expenses,
      report.totals.profit,
    ]);
    totalRow.font = { bold: true };

    [6, 18, 24, 18, 12, 18, 10, 16, 16, 16, 16].forEach((width, i) => {
      summary.getColumn(i + 1).width = width;
    });
    [8, 9, 10, 11].forEach((col) => (summary.getColumn(col).numFmt = currencyFmt));

    // Sheet 2: rincian transaksi per pengiriman
    const detail = workbook.addWorksheet('Rincian Transaksi');
    detail.columns = [
      { header: 'No. Pengiriman', key: 'deliveryNumber', width: 18 },
      { header: 'Kendaraan', key: 'vehicleName', width: 18 },
      { header: 'Invoice', key: 'invoiceNumber', width: 20 },
      { header: 'Pelanggan', key: 'customerName', width: 24 },
      { header: 'Pendapatan', key: 'revenue', width: 16 },
      { header: 'HPP', key: 'hpp', width: 16 },
      { header: 'Laba Kotor', key: 'grossProfit', width: 16 },
    ];
    detail.getRow(1).font = { bold: true };
    detail.getRow(1).eachCell((cell) => (cell.fill = headerFill));
    for (const d of report.deliveries) {
      for (const t of d.transactions) {
        detail.addRow({ deliveryNumber: d.deliveryNumber, vehicleName: d.vehicleName, ...t });
      }
    }
    ['revenue', 'hpp', 'grossProfit'].forEach((key) => (detail.getColumn(key).numFmt = currencyFmt));

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-pengiriman-${date}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Delivery profit report error:', error);
    return NextResponse.json({ error: 'Gagal membuat laporan pengiriman' }, { status: 500 });
  }
}
