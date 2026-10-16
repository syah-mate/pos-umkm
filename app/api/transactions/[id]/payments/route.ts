import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { getAuthUser } from '@/lib/auth';
import { computePaymentStatus, getAmountPaid } from '@/lib/distribution';

// POST record a payment (pelunasan / cicilan) for a transaction
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
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Nominal pembayaran harus lebih dari 0' }, { status: 400 });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });

    const paidSoFar = getAmountPaid(transaction);
    const remaining = transaction.total - paidSoFar;
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Transaksi sudah lunas' }, { status: 400 });
    }
    if (amount > remaining) {
      return NextResponse.json(
        { error: `Nominal melebihi sisa tagihan (${remaining})` },
        { status: 400 }
      );
    }

    transaction.payments.push({
      amount,
      method: body.method || 'cash',
      date: new Date(),
      notes: body.notes,
      receivedByName: user.name,
      delivery: body.deliveryId || undefined,
    });
    transaction.amountPaid = paidSoFar + amount;
    transaction.paymentStatus = computePaymentStatus(transaction.total, transaction.amountPaid);
    await transaction.save();

    return NextResponse.json(
      { message: 'Pembayaran berhasil dicatat', transaction },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Record payment error:', error);
    return NextResponse.json({ error: 'Gagal mencatat pembayaran' }, { status: 500 });
  }
}
