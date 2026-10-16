import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Warehouse from '@/models/Warehouse';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

// GET all warehouses (with product count & stock summary)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const active = request.nextUrl.searchParams.get('active');
    const query: any = { isActive: active === null ? true : active === 'true' };

    const warehouses = await Warehouse.find(query).sort({ name: 1 }).lean();

    const stats = await Product.aggregate([
      { $match: { isActive: true, warehouse: { $ne: null } } },
      {
        $group: {
          _id: '$warehouse',
          productCount: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          stockValue: { $sum: { $multiply: ['$stock', '$cost'] } },
        },
      },
    ]);
    const statMap = new Map(stats.map((s: any) => [String(s._id), s]));

    const data = warehouses.map((w: any) => {
      const stat = statMap.get(String(w._id));
      return {
        ...w,
        productCount: stat?.productCount || 0,
        totalStock: stat?.totalStock || 0,
        stockValue: stat?.stockValue || 0,
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Get warehouses error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data gudang' }, { status: 500 });
  }
}

// POST create warehouse
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: 'Kode dan nama gudang wajib diisi' }, { status: 400 });
    }

    const warehouse = await Warehouse.create(body);
    return NextResponse.json({ message: 'Gudang berhasil ditambahkan', warehouse }, { status: 201 });
  } catch (error: any) {
    console.error('Create warehouse error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Kode gudang sudah dipakai' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan gudang' }, { status: 500 });
  }
}
