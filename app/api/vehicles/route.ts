import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import { getAuthUser } from '@/lib/auth';

// GET all vehicles
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const active = request.nextUrl.searchParams.get('active');
    const query: any = { isActive: active === null ? true : active === 'true' };

    const vehicles = await Vehicle.find(query).sort({ name: 1 });
    return NextResponse.json({ data: vehicles }, { status: 200 });
  } catch (error: any) {
    console.error('Get vehicles error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kendaraan' }, { status: 500 });
  }
}

// POST create vehicle
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.driverName) {
      return NextResponse.json({ error: 'Nama kendaraan dan driver wajib diisi' }, { status: 400 });
    }

    const vehicle = await Vehicle.create(body);
    return NextResponse.json({ message: 'Kendaraan berhasil ditambahkan', vehicle }, { status: 201 });
  } catch (error: any) {
    console.error('Create vehicle error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan kendaraan' }, { status: 500 });
  }
}
