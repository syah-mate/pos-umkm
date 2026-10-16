import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Warehouse from '@/models/Warehouse';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth';

// PUT update warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const warehouse = await Warehouse.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!warehouse) return NextResponse.json({ error: 'Gudang tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ message: 'Gudang berhasil diupdate', warehouse }, { status: 200 });
  } catch (error: any) {
    console.error('Update warehouse error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Kode gudang sudah dipakai' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal mengupdate gudang' }, { status: 500 });
  }
}

// DELETE warehouse (soft delete, ditolak jika masih ada produk aktif)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const productCount = await Product.countDocuments({ warehouse: id, isActive: true });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Gudang masih dipakai oleh ${productCount} produk aktif. Pindahkan produknya dulu.` },
        { status: 400 }
      );
    }

    const warehouse = await Warehouse.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!warehouse) return NextResponse.json({ error: 'Gudang tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ message: 'Gudang berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete warehouse error:', error);
    return NextResponse.json({ error: 'Gagal menghapus gudang' }, { status: 500 });
  }
}
