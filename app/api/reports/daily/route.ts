import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    // Get transactions for the day
    const transactions = await Transaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: 'paid',
    }).sort({ createdAt: -1 });
    
    // Calculate totals
    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    const totalItems = transactions.reduce((sum, t) => 
      sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    
    // Payment method breakdown
    const paymentBreakdown = transactions.reduce((acc: any, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
      return acc;
    }, {});
    
    // Top selling products
    const productSales: any = {};
    transactions.forEach(t => {
      t.items.forEach(item => {
        const key = item.product.toString();
        if (!productSales[key]) {
          productSales[key] = {
            product: item.product,
            name: item.productName,
            sku: item.sku,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.subtotal;
      });
    });
    
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);
    
    // Hourly sales
    const hourlySales = Array(24).fill(0);
    transactions.forEach(t => {
      const hour = new Date(t.createdAt).getHours();
      hourlySales[hour] += t.total;
    });
    
    return NextResponse.json({
      data: {
        date,
        totalSales,
        totalTransactions,
        totalItems,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
        paymentBreakdown,
        topProducts,
        hourlySales,
        transactions: transactions.slice(0, 20), // Last 20 transactions
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Daily report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily report' },
      { status: 500 }
    );
  }
}
