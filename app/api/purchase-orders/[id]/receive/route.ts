import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import Product from '@/models/Product';

// Helper function to round stock to 2 decimal places
function roundStock(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const body = await request.json();

    const po = await PurchaseOrder.findById(id);

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    if (po.status === 'received' || po.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Purchase order already processed' },
        { status: 400 }
      );
    }

    // Update received quantities and stock
    const receivedItems = body.items || [];
    
    for (const receivedItem of receivedItems) {
      const productId = receivedItem.product;
      const quantity = receivedItem.receivedQty;
      
      const poItem = po.items.find(
        item => item.product.toString() === productId
      );
      
      if (poItem && quantity > 0) {
        poItem.receivedQuantity = (poItem.receivedQuantity || 0) + quantity;
        
        // Update product stock with rounding to 2 decimal places
        const product = await Product.findById(productId);
        if (product) {
          product.stock = roundStock(product.stock + quantity);
          await product.save();
        }
      }
    }

    // Check if all items are fully received
    const allReceived = po.items.every(
      item => item.receivedQuantity && item.receivedQuantity >= item.quantity
    );
    
    const someReceived = po.items.some(
      item => item.receivedQuantity && item.receivedQuantity > 0
    );

    po.status = allReceived ? 'received' : (someReceived ? 'partial' : 'sent');
    
    if (allReceived) {
      po.receivedDate = new Date();
    }

    await po.save();

    return NextResponse.json(
      { 
        message: 'Stock received successfully', 
        purchaseOrder: po,
        status: po.status
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Receive stock error:', error);
    return NextResponse.json(
      { error: 'Failed to receive stock' },
      { status: 500 }
    );
  }
}
