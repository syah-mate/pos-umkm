import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Delivery from '@/models/Delivery';
import Vehicle from '@/models/Vehicle';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import {
  TRANSACTION_FIELDS,
  generateDeliveryNumber,
  summarizeDelivery,
  validateDeliveryTransactions,
} from '@/lib/deliveryService';

// GET all deliveries
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 1000);

    const query: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const deliveries = await Delivery.find(query)
      .populate('transactions', TRANSACTION_FIELDS)
      .populate('vehicle', 'name plateNumber capacity')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ data: deliveries.map(summarizeDelivery) }, { status: 200 });
  } catch (error: any) {
    console.error('Get deliveries error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengiriman' }, { status: 500 });
  }
}

// POST create delivery record
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.vehicle || !body.date) {
      return NextResponse.json({ error: 'Nama pengiriman, tanggal, dan kendaraan wajib diisi' }, { status: 400 });
    }

    const vehicle = await Vehicle.findById(body.vehicle);
    if (!vehicle || !vehicle.isActive) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 });
    }

    const transactionIds: string[] = body.transactions || [];
    const check = await validateDeliveryTransactions(transactionIds, vehicle.capacity);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: 400 });

    const date = new Date(body.date);
    const delivery = await Delivery.create({
      deliveryNumber: await generateDeliveryNumber(date),
      name: body.name,
      date,
      vehicle: vehicle._id,
      vehicleName: vehicle.name,
      plateNumber: vehicle.plateNumber,
      driverName: body.driverName || vehicle.driverName,
      transactions: transactionIds,
      notes: body.notes,
      createdBy: user.userId,
      createdByName: user.name,
    });

    await Transaction.updateMany(
      { _id: { $in: transactionIds } },
      { deliveryStatus: 'delivered', delivery: delivery._id }
    );

    return NextResponse.json({ message: 'Pengiriman berhasil dicatat', delivery }, { status: 201 });
  } catch (error: any) {
    console.error('Create delivery error:', error);
    return NextResponse.json({ error: 'Gagal mencatat pengiriman' }, { status: 500 });
  }
}
