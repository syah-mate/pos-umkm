import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockOpname from '@/models/StockOpname';
import StockOpnameItem from '@/models/StockOpnameItem';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang bisa finalisasi' }, { status: 403 });
    }

    const { id } = await params;
    const session = await StockOpname.findById(id);
    if (!session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    if (!['open', 'in_progress'].includes(session.status)) {
      return NextResponse.json({ error: 'Sesi tidak bisa difinalisasi' }, { status: 400 });
    }

    const items = await StockOpnameItem.find({ session: id });

    // Update stok produk yang sudah dihitung
    const countedItems = items.filter((item: any) => item.isCounted && item.physicalCount !== null);

    await Promise.all(
      countedItems.map((item: any) =>
        Product.findByIdAndUpdate(item.product, { stock: item.physicalCount })
      )
    );

    // Hitung agregat
    const totalDifference = items.reduce((sum: number, item: any) => {
      return sum + (item.difference ?? 0);
    }, 0);

    const totalLossValue = items.reduce((sum: number, item: any) => {
      return sum + (item.lossValue ?? 0);
    }, 0);

    const countedCount = countedItems.length;

    await StockOpname.findByIdAndUpdate(id, {
      status: 'completed',
      finalizedAt: new Date(),
      finalizedBy: user.userId,
      finalizedByName: user.name,
      countedItems: countedCount,
      totalDifference,
      totalLossValue,
    });

    return NextResponse.json({
      success: true,
      adjustedProducts: countedCount,
      totalDifference,
      totalLossValue,
    }, { status: 200 });
  } catch (error: any) {
    console.error('POST finalize error:', error);
    return NextResponse.json({ error: 'Gagal finalisasi' }, { status: 500 });
  }
}
