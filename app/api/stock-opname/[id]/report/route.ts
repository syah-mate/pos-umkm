import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockOpname from '@/models/StockOpname';
import StockOpnameItem from '@/models/StockOpnameItem';
import { getAuthUser } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const session = await StockOpname.findById(id);
    if (!session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });

    const items = await StockOpnameItem.find({ session: id }).sort({ productName: 1 });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stok Opname');

    // Set column widths
    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Nama Produk', key: 'productName', width: 30 },
      { header: 'Kategori', key: 'category', width: 20 },
      { header: 'Satuan', key: 'unit', width: 10 },
      { header: 'Snapshot', key: 'snapshotStock', width: 12 },
      { header: 'Fisik', key: 'physicalCount', width: 12 },
      { header: 'Selisih', key: 'difference', width: 12 },
      { header: 'HPP', key: 'costAtTime', width: 15 },
      { header: 'Nilai Selisih (Rp)', key: 'lossValue', width: 18 },
      { header: 'Alasan', key: 'reason', width: 20 },
      { header: 'Catatan', key: 'notes', width: 30 },
      { header: 'Sudah Dihitung', key: 'isCounted', width: 15 },
      { header: 'Dihitung Oleh', key: 'countedByName', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    items.forEach((item: any) => {
      worksheet.addRow({
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        unit: item.unit,
        snapshotStock: item.snapshotStock,
        physicalCount: item.physicalCount ?? '',
        difference: item.difference ?? '',
        costAtTime: item.costAtTime,
        lossValue: item.lossValue,
        reason: item.reason || '',
        notes: item.notes || '',
        isCounted: item.isCounted ? 'Ya' : 'Tidak',
        countedByName: item.countedByName || '',
      });
    });

    // Apply number format to currency columns
    worksheet.getColumn('costAtTime').numFmt = '#,##0';
    worksheet.getColumn('lossValue').numFmt = '#,##0';

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `stok-opname-${session.sessionName.replace(/\s+/g, '-')}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Gagal generate laporan' }, { status: 500 });
  }
}
