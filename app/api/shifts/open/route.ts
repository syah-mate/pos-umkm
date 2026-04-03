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

    const shift = await Shift.create({
      cashier: body.cashier,
      cashierName: body.cashierName,
      startingCash: body.startingCash,
      startTime: new Date(),
      status: 'open',
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
