import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Supplier from '@/models/Supplier';

// GET - Get all suppliers
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers', message: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new supplier
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const supplier = await Supplier.create(body);

    return NextResponse.json({
      success: true,
      supplier,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier', message: error.message },
      { status: 500 }
    );
  }
}
