import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import Supplier from '@/models/Supplier';
import Product from '@/models/Product';
import User from '@/models/User';

// GET all purchase orders
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplier', 'name phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ orderDate: -1 })
      .limit(100);
    
    return NextResponse.json({ data: purchaseOrders }, { status: 200 });
  } catch (error: any) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

// POST create new purchase order
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    console.log('Received PO data:', body);

    if (!body.supplier || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Supplier and items are required' },
        { status: 400 }
      );
    }

    // Get supplier name
    const Supplier = (await import('@/models/Supplier')).default;
    const supplier = await Supplier.findById(body.supplier);
    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Get product details and calculate subtotals
    const Product = (await import('@/models/Product')).default;
    const processedItems = await Promise.all(
      body.items.map(async (item: any) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product ${item.product} not found`);
        }
        return {
          product: item.product,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
          receivedQuantity: 0,
        };
      })
    );

    // Calculate totals
    const subtotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = body.tax || 0;
    const total = subtotal + tax;

    // Get user info from token (you might need to decode JWT)
    // For now, using a default user
    const User = (await import('@/models/User')).default;
    const user = await User.findOne(); // Get first user for now
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate PO number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await PurchaseOrder.countDocuments({
      orderDate: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      },
    });
    const poNumber = `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const poData = {
      poNumber,
      supplier: body.supplier,
      supplierName: supplier.name,
      items: processedItems,
      subtotal,
      tax,
      total,
      status: body.status || 'draft',
      orderDate: body.orderDate || new Date(),
      expectedDate: body.expectedDate || undefined,
      createdBy: user._id,
      createdByName: user.name,
      notes: body.notes || '',
    };

    console.log('Creating PO with data:', poData);

    const po = await PurchaseOrder.create(poData);

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name');

    return NextResponse.json(
      { message: 'Purchase order created successfully', purchaseOrder: populatedPO },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create purchase order error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order', message: error.message },
      { status: 500 }
    );
  }
}
