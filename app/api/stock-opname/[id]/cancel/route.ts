import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockOpname from '@/models/StockOpname';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const session = await StockOpname.findById(id);
    if (!session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Sesi yang sudah selesai tidak bisa dibatalkan' }, { status: 400 });
    }

    await StockOpname.findByIdAndUpdate(id, { status: 'cancelled' });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal membatalkan sesi' }, { status: 500 });
  }
}
