import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shift from '@/models/Shift';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.cashier || !body.cashierName || body.startingCash === undefined) {
      return NextResponse.json(
        { error: 'Cashier and starting cash are required' },
        { status: 400 }
      );
    }

    // Check if cashier has an open shift
    const openShift = await Shift.findOne({
      cashier: body.cashier,
      status: 'open',
    });

    if (openShift) {
      return NextResponse.json(
        { error: 'Cashier already has an open shift' },
        { status: 409 }
      );
    }

    // Generate shift name: "nama_tanggal dan jam"
    // Example: "admin_16 Apr 2026, 09.30"
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const shiftName = `${body.cashierName}_${formattedDate}, ${formattedTime}`;

    const shift = await Shift.create({
      shiftName,
      cashier: body.cashier,
      cashierName: body.cashierName,
      startingCash: body.startingCash,
      startTime: now,
      status: 'open',
      notes: body.notes,
    });

    return NextResponse.json(
      { message: 'Shift opened successfully', shift },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Open shift error:', error);
    return NextResponse.json(
      { error: 'Failed to open shift' },
      { status: 500 }
    );
  }
}
