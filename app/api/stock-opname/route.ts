import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockOpname from '@/models/StockOpname';
import StockOpnameItem from '@/models/StockOpnameItem';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    const query: any = {};
    if (status) query.status = status;

    const sessions = await StockOpname.find(query).sort({ openedAt: -1 });
    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error: any) {
    console.error('GET stock-opname error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Hanya admin yang boleh buka sesi
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang bisa membuka sesi opname' }, { status: 403 });
    }

    // Cek sesi aktif
    const activeSesi = await StockOpname.findOne({ status: { $in: ['open', 'in_progress'] } });
    if (activeSesi) {
      return NextResponse.json(
        { error: 'Sudah ada sesi opname yang aktif. Selesaikan dulu sebelum membuka sesi baru.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sessionName, categoryFilter = [], notes } = body;

    if (!sessionName?.trim()) {
      return NextResponse.json({ error: 'Nama sesi wajib diisi' }, { status: 400 });
    }

    // Ambil produk yang akan di-opname
    const productQuery: any = { isActive: true };
    if (categoryFilter.length > 0) {
      productQuery.category = { $in: categoryFilter };
    }

    const products = await Product.find(productQuery).populate('category', 'name');

    if (products.length === 0) {
      return NextResponse.json({ error: 'Tidak ada produk aktif yang bisa di-opname' }, { status: 400 });
    }

    // Buat sesi
    const session = await StockOpname.create({
      sessionName: sessionName.trim(),
      status: 'open',
      categoryFilter,
      openedBy: user.userId,
      openedByName: user.name,
      openedAt: new Date(),
      totalItems: products.length,
      countedItems: 0,
      notes,
    });

    // Buat items snapshot
    const items = products.map((p: any) => ({
      session: session._id,
      product: p._id,
      productName: p.name,
      sku: p.sku,
      category: p.category?.name || '',
      unit: p.unit,
      snapshotStock: p.stock,
      physicalCount: null,
      difference: null,
      costAtTime: p.cost,
      lossValue: 0,
      isCounted: false,
    }));

    await StockOpnameItem.insertMany(items);

    return NextResponse.json({ session, totalProducts: products.length }, { status: 201 });
  } catch (error: any) {
    console.error('POST stock-opname error:', error);
    return NextResponse.json({ error: 'Gagal membuat sesi opname' }, { status: 500 });
  }
}
