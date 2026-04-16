import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockOpname from '@/models/StockOpname';
import StockOpnameItem from '@/models/StockOpnameItem';
import { getAuthUser } from '@/lib/auth';

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

    const { searchParams } = request.nextUrl;
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    const itemQuery: any = { session: id };
    if (filter === 'uncounted') itemQuery.isCounted = false;
    if (filter === 'diff') itemQuery.$expr = { $and: [{ $ne: ['$difference', null] }, { $ne: ['$difference', 0] }] };
    if (search) {
      itemQuery.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await StockOpnameItem.find(itemQuery).sort({ productName: 1 });

    return NextResponse.json({ session, items }, { status: 200 });
  } catch (error: any) {
    console.error('GET stock-opname/[id] error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
