import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Delivery from '@/models/Delivery';
import Vehicle from '@/models/Vehicle';
import Transaction from '@/models/Transaction';
import '@/models/Customer';
import { getAuthUser } from '@/lib/auth';
import {
  TRANSACTION_FIELDS,
  summarizeDelivery,
  validateDeliveryTransactions,
} from '@/lib/deliveryService';

// GET single delivery with full transaction detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const delivery = await Delivery.findById(id)
      .populate({
        path: 'transactions',
        select: TRANSACTION_FIELDS,
        populate: { path: 'customer', select: 'name phone address' },
      })
      .populate('vehicle', 'name plateNumber driverName driverPhone capacity');

    if (!delivery) return NextResponse.json({ error: 'Pengiriman tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ delivery: summarizeDelivery(delivery) }, { status: 200 });
  } catch (error: any) {
    console.error('Get delivery error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengiriman' }, { status: 500 });
  }
}

// PUT update delivery plan (hanya saat status 'planned')
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const delivery = await Delivery.findById(id);
    if (!delivery) return NextResponse.json({ error: 'Pengiriman tidak ditemukan' }, { status: 404 });

    if (delivery.status !== 'planned') {
      // Setelah berangkat hanya catatan yang boleh diubah
      if (body.notes !== undefined) {
        delivery.notes = body.notes;
        await delivery.save();
        return NextResponse.json({ message: 'Catatan berhasil diupdate', delivery }, { status: 200 });
      }
      return NextResponse.json({ error: 'Pengiriman yang sudah berangkat tidak bisa diubah' }, { status: 400 });
    }

    const vehicleId = body.vehicle || String(delivery.vehicle);
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 });

    const newIds: string[] = (body.transactions || delivery.transactions).map(String);
    const check = await validateDeliveryTransactions(newIds, vehicle.capacity, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: 400 });

    const oldIds = delivery.transactions.map(String);
    const removed = oldIds.filter((t) => !newIds.includes(t));
    const added = newIds.filter((t) => !oldIds.includes(t));

    if (String(delivery.vehicle) !== String(vehicle._id)) {
      delivery.vehicle = vehicle._id as any;
      delivery.vehicleName = vehicle.name;
      delivery.plateNumber = vehicle.plateNumber;
      delivery.driverName = body.driverName || vehicle.driverName;
    } else if (body.driverName) {
      delivery.driverName = body.driverName;
    }
    if (body.name) delivery.name = body.name;
    if (body.date) delivery.date = new Date(body.date);
    if (body.notes !== undefined) delivery.notes = body.notes;
    delivery.transactions = newIds as any;
    await delivery.save();

    if (removed.length > 0) {
      await Transaction.updateMany(
        { _id: { $in: removed } },
        { deliveryStatus: 'pending', $unset: { delivery: 1 } }
      );
    }
    if (added.length > 0) {
      await Transaction.updateMany(
        { _id: { $in: added } },
        { deliveryStatus: 'scheduled', delivery: delivery._id }
      );
    }

    return NextResponse.json({ message: 'Plan pengiriman berhasil diupdate', delivery }, { status: 200 });
  } catch (error: any) {
    console.error('Update delivery error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate pengiriman' }, { status: 500 });
  }
}

// DELETE cancel delivery plan (hanya saat status 'planned'); transaksi dikembalikan ke antrian
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const delivery = await Delivery.findById(id);
    if (!delivery) return NextResponse.json({ error: 'Pengiriman tidak ditemukan' }, { status: 404 });
    if (delivery.status !== 'planned') {
      return NextResponse.json({ error: 'Hanya pengiriman berstatus direncanakan yang bisa dibatalkan' }, { status: 400 });
    }

    delivery.status = 'cancelled';
    await delivery.save();

    await Transaction.updateMany(
      { _id: { $in: delivery.transactions }, delivery: delivery._id },
      { deliveryStatus: 'pending', $unset: { delivery: 1 } }
    );

    return NextResponse.json({ message: 'Pengiriman dibatalkan' }, { status: 200 });
  } catch (error: any) {
    console.error('Cancel delivery error:', error);
    return NextResponse.json({ error: 'Gagal membatalkan pengiriman' }, { status: 500 });
  }
}
