import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Delivery from '@/models/Delivery';
import { getAuthUser } from '@/lib/auth';

// POST add an expense claim (bensin, tol, dll) to a delivery
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const amount = Number(body.amount);
    if (!body.category || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Kategori dan nominal pengeluaran wajib diisi' }, { status: 400 });
    }

    const delivery = await Delivery.findById(id);
    if (!delivery) return NextResponse.json({ error: 'Pengiriman tidak ditemukan' }, { status: 404 });
    if (delivery.status === 'cancelled') {
      return NextResponse.json({ error: 'Pengiriman sudah dibatalkan' }, { status: 400 });
    }

    delivery.expenses.push({
      category: body.category,
      description: body.description,
      amount,
      date: body.date ? new Date(body.date) : new Date(),
      createdByName: user.name,
    });
    await delivery.save();

    return NextResponse.json({ message: 'Pengeluaran berhasil ditambahkan', delivery }, { status: 201 });
  } catch (error: any) {
    console.error('Add delivery expense error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan pengeluaran' }, { status: 500 });
  }
}

// DELETE remove an expense: /api/deliveries/:id/expenses?expenseId=...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!getAuthUser(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const expenseId = request.nextUrl.searchParams.get('expenseId');
    if (!expenseId) return NextResponse.json({ error: 'expenseId wajib diisi' }, { status: 400 });

    const delivery = await Delivery.findByIdAndUpdate(
      id,
      { $pull: { expenses: { _id: expenseId } } },
      { new: true }
    );
    if (!delivery) return NextResponse.json({ error: 'Pengiriman tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ message: 'Pengeluaran dihapus', delivery }, { status: 200 });
  } catch (error: any) {
    console.error('Delete delivery expense error:', error);
    return NextResponse.json({ error: 'Gagal menghapus pengeluaran' }, { status: 500 });
  }
}
