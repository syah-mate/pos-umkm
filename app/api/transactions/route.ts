import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import User from '@/models/User';
import '@/models/Delivery';
import { computePaymentStatus } from '@/lib/distribution';

// Helper function to round stock to 2 decimal places
function roundStock(value: number): number {
  return Math.round(value * 100) / 100;
}

// GET all transactions with filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Ensure User model is registered
    await User.init();
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cashier = searchParams.get('cashier');
    const paymentMethod = searchParams.get('paymentMethod');
    const paymentStatus = searchParams.get('paymentStatus'); // paid | partial | unpaid | outstanding
    const deliveryStatus = searchParams.get('deliveryStatus');
    const customer = searchParams.get('customer');
    const search = searchParams.get('search');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 1000);
    
    const query: any = {};
    
    if (startDate && endDate) {
      // Set start date to beginning of day
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      // Set end date to end of day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }
    
    if (cashier) {
      query.cashier = cashier;
    }
    
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (paymentStatus === 'outstanding') {
      query.paymentStatus = { $in: ['unpaid', 'partial', 'pending'] };
    } else if (paymentStatus === 'unpaid') {
      query.paymentStatus = { $in: ['unpaid', 'pending'] };
    } else if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (deliveryStatus) {
      query.deliveryStatus = { $in: deliveryStatus.split(',') };
    }

    if (customer) {
      query.customer = customer;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }
    
    const transactions = await Transaction.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name phone address')
      .populate('delivery', 'deliveryNumber name status')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return NextResponse.json({ data: transactions }, { status: 200 });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST create new transaction
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Transaction must have at least one item' },
        { status: 400 }
      );
    }

    // Generate invoice number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Transaction.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      },
    });
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Kasir hanya menyimpan transaksi; pembayaran hanya dicatat saat pengiriman
    const total = Number(body.total) || 0;
    const amountPaid = 0;
    const paymentStatus = computePaymentStatus(total, amountPaid);

    // Pelanggan wajib agar transaksi bisa dikirim & ditagih
    if (!body.customer) {
      return NextResponse.json(
        { error: 'Transaksi wajib memilih pelanggan' },
        { status: 400 }
      );
    }

    // Validate stock for all items before deducting anything
    for (const item of body.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productName} not found` },
          { status: 404 }
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stok tidak cukup untuk produk: ${product.name} (tersisa ${product.stock})` },
          { status: 400 }
        );
      }
      // Snapshot tipe ukuran, satuan & HPP untuk muatan, surat jalan dan laporan laba
      item.sizeType = product.sizeType || 'kecil';
      item.unit = product.unit;
      item.cost = product.cost || 0;
    }

    // Deduct stock (already validated above)
    for (const item of body.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = roundStock(product.stock - item.quantity);
        await product.save();
      }
    }

    // Update customer stats if provided
    let customerDoc = null;
    if (body.customer) {
      customerDoc = await Customer.findById(body.customer);
      await Customer.findByIdAndUpdate(body.customer, {
        $inc: {
          totalSpent: body.total,
          transactionCount: 1,
          loyaltyPoints: Math.floor(body.total / 1000), // 1 point per 1000
        },
        lastVisit: new Date(),
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      ...body,
      invoiceNumber,
      paymentMethod: 'cash',
      paymentStatus,
      amountPaid,
      cashReceived: 0,
      change: 0,
      payments: [],
      deliveryStatus: 'pending',
      customerPhone: customerDoc?.phone,
      customerAddress: customerDoc?.address,
      isSynced: true,
      syncedAt: new Date(),
    });

    // Ensure User model is registered before populate
    await User.init();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('cashier', 'name')
      .populate('customer', 'name phone');

    return NextResponse.json(
      { message: 'Transaction created successfully', transaction: populatedTransaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
