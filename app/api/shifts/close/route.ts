import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shift from '@/models/Shift';
import Transaction from '@/models/Transaction';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.shiftId || body.endingCash === undefined) {
      return NextResponse.json(
        { error: 'Shift ID and ending cash are required' },
        { status: 400 }
      );
    }

    const shift = await Shift.findById(body.shiftId);

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    if (shift.status === 'closed') {
      return NextResponse.json(
        { error: 'Shift is already closed' },
        { status: 400 }
      );
    }

    // Calculate shift statistics
    const transactions = await Transaction.find({
      shift: shift._id,
      paymentStatus: 'paid',
    });

    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const cashTransactions = transactions.filter(t => t.paymentMethod === 'cash');
    const totalCashSales = cashTransactions.reduce((sum, t) => sum + t.total, 0);
    const expectedCash = shift.startingCash + totalCashSales;
    const cashDifference = body.endingCash - expectedCash;

    // Update shift
    shift.endTime = new Date();
    shift.endingCash = body.endingCash;
    shift.expectedCash = expectedCash;
    shift.cashDifference = cashDifference;
    shift.totalTransactions = transactions.length;
    shift.totalSales = totalSales;
    shift.status = 'closed';
    shift.notes = body.notes;

    await shift.save();

    return NextResponse.json(
      { 
        message: 'Shift closed successfully', 
        shift,
        summary: {
          totalTransactions: transactions.length,
          totalSales,
          totalCashSales,
          expectedCash,
          actualCash: body.endingCash,
          difference: cashDifference,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Close shift error:', error);
    return NextResponse.json(
      { error: 'Failed to close shift' },
      { status: 500 }
    );
  }
}
