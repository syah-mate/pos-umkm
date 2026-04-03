import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shift from '@/models/Shift';

// GET all shifts
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const cashier = searchParams.get('cashier');
    const status = searchParams.get('status');
    
    const query: any = {};
    
    if (cashier) {
      query.cashier = cashier;
    }
    
    if (status) {
      query.status = status;
    }
    
    const shifts = await Shift.find(query)
      .populate('cashier', 'name email')
      .sort({ startTime: -1 })
      .limit(50);
    
    return NextResponse.json({ shifts }, { status: 200 });
  } catch (error: any) {
    console.error('Get shifts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    );
  }
}
