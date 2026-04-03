import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all products with stock status
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .sort({ stock: 1 });
    
    // Low stock products
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);
    
    // Out of stock products
    const outOfStockProducts = products.filter(p => p.stock === 0);
    
    // Stock value
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    
    return NextResponse.json({
      summary: {
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalStockValue,
        totalRetailValue,
        potentialProfit: totalRetailValue - totalStockValue,
      },
      lowStockProducts,
      outOfStockProducts,
      allProducts: products,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Inventory report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate inventory report' },
      { status: 500 }
    );
  }
}
