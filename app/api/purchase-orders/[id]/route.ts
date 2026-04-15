import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import Supplier from '@/models/Supplier';
import Product from '@/models/Product';
import User from '@/models/User';

// GET single purchase order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('supplier', 'name phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name');

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      purchaseOrder 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Get purchase order error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order', message: error.message },
      { status: 500 }
    );
  }
}

// PUT update purchase order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const body = await request.json();

    console.log('Updating PO:', id, 'with data:', body);

    // Get supplier name if supplier changed
    let supplierName;
    if (body.supplier) {
      const Supplier = (await import('@/models/Supplier')).default;
      const supplier = await Supplier.findById(body.supplier);
      if (!supplier) {
        return NextResponse.json(
          { error: 'Supplier not found' },
          { status: 404 }
        );
      }
      supplierName = supplier.name;
    }

    // Process items if provided
    let processedItems;
    if (body.items && body.items.length > 0) {
      const Product = (await import('@/models/Product')).default;
      processedItems = await Promise.all(
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
            receivedQuantity: item.receivedQuantity || 0,
          };
        })
      );
    }

    // Calculate totals if items changed
    let subtotal, total;
    if (processedItems) {
      subtotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = body.tax || 0;
      total = subtotal + tax;
    }

    // Build update data
    const updateData: any = {
      ...body,
    };

    if (supplierName) updateData.supplierName = supplierName;
    if (processedItems) updateData.items = processedItems;
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (total !== undefined) updateData.total = total;

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('supplier', 'name phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name');

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Purchase order updated successfully', 
        purchaseOrder 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update purchase order error:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase order', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE purchase order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(id);

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Purchase order deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete purchase order error:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase order', message: error.message },
      { status: 500 }
    );
  }
}
