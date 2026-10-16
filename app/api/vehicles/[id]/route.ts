import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Delivery from '@/models/Delivery';
import { getAuthUser } from '@/lib/auth';

// PUT update vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const vehicle = await Vehicle.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!vehicle) return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ message: 'Kendaraan berhasil diupdate', vehicle }, { status: 200 });
  } catch (error: any) {
    console.error('Update vehicle error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate kendaraan' }, { status: 500 });
  }
}

// DELETE vehicle (soft delete, ditolak jika sedang dipakai pengiriman aktif)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeDelivery = await Delivery.findOne({
      vehicle: id,
      status: { $in: ['planned', 'on_delivery'] },
    });
    if (activeDelivery) {
      return NextResponse.json(
        { error: `Kendaraan masih dipakai di pengiriman ${activeDelivery.deliveryNumber}` },
        { status: 400 }
      );
    }

    const vehicle = await Vehicle.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!vehicle) return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ message: 'Kendaraan berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete vehicle error:', error);
    return NextResponse.json({ error: 'Gagal menghapus kendaraan' }, { status: 500 });
  }
}
