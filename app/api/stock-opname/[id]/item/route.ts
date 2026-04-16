import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockOpname from '@/models/StockOpname';
import StockOpnameItem from '@/models/StockOpnameItem';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
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
    if (session.status === 'completed' || session.status === 'cancelled') {
      return NextResponse.json({ error: 'Sesi sudah selesai atau dibatalkan' }, { status: 400 });
    }

    const body = await request.json();
    const { itemId, physicalCount, reason, notes } = body;

    if (physicalCount === undefined || physicalCount === null || physicalCount < 0) {
      return NextResponse.json({ error: 'physicalCount tidak valid' }, { status: 400 });
    }

    const item = await StockOpnameItem.findOne({ _id: itemId, session: id });
    if (!item) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });

    const difference = physicalCount - item.snapshotStock;
    const lossValue = difference < 0 ? Math.abs(difference) * item.costAtTime : 0;

    await StockOpnameItem.findByIdAndUpdate(itemId, {
      physicalCount,
      difference,
      lossValue,
      reason: reason || undefined,
      notes: notes || undefined,
      isCounted: true,
      countedBy: user.userId,
      countedByName: user.name,
      countedAt: new Date(),
    });

    // Update counter di sesi
    const countedCount = await StockOpnameItem.countDocuments({ session: id, isCounted: true });
    const updateData: any = { countedItems: countedCount };
    if (session.status === 'open') updateData.status = 'in_progress';

    await StockOpname.findByIdAndUpdate(id, updateData);

    return NextResponse.json({ success: true, difference, lossValue }, { status: 200 });
  } catch (error: any) {
    console.error('PATCH item error:', error);
    return NextResponse.json({ error: 'Gagal update item' }, { status: 500 });
  }
}
