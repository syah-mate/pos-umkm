import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Delivery from '@/models/Delivery';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';

const NEXT_STATUS: Record<string, string[]> = {
  planned: ['on_delivery', 'completed'],
  on_delivery: ['completed'],
};

// POST change delivery status: planned -> on_delivery -> completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status } = await request.json();
    const delivery = await Delivery.findById(id);
    if (!delivery) return NextResponse.json({ error: 'Pengiriman tidak ditemukan' }, { status: 404 });

    if (!NEXT_STATUS[delivery.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Status tidak bisa diubah dari ${delivery.status} ke ${status}` },
        { status: 400 }
      );
    }

    delivery.status = status;
    if (status === 'on_delivery') delivery.departedAt = new Date();
    if (status === 'completed') {
      delivery.completedAt = new Date();
      if (!delivery.departedAt) delivery.departedAt = delivery.completedAt;
    }
    await delivery.save();

    await Transaction.updateMany(
      { _id: { $in: delivery.transactions }, delivery: delivery._id },
      { deliveryStatus: status === 'completed' ? 'delivered' : 'on_delivery' }
    );

    return NextResponse.json({ message: 'Status pengiriman diupdate', delivery }, { status: 200 });
  } catch (error: any) {
    console.error('Update delivery status error:', error);
    return NextResponse.json({ error: 'Gagal mengubah status pengiriman' }, { status: 500 });
  }
}
