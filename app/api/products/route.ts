import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import '@/models/Warehouse';

// Helper function to round stock to 2 decimal places
function roundStock(value: number): number {
  return Math.round(value * 100) / 100;
}

// GET all products with filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const active = searchParams.get('active');
    const categoryType = searchParams.get('categoryType'); // 'ingredient' or 'product'
    const warehouse = searchParams.get('warehouse');
    const sizeType = searchParams.get('sizeType');
    
    const query: any = {};
    
    if (category) {
      query.category = category;
    }

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (sizeType) {
      query.sizeType = sizeType;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Default: hanya tampilkan produk aktif, kecuali explicitly diminta untuk tampilkan nonaktif
    if (active !== null && active !== undefined) {
      query.isActive = active === 'true';
    } else {
      query.isActive = true; // Default: hanya produk aktif
    }
    
    let products = await Product.find(query)
      .populate('category', 'name color type')
      .populate('warehouse', 'code name')
      .sort({ name: 1 });
    
    // Filter by category type if specified
    if (categoryType) {
      products = products.filter((product: any) => 
        product.category && product.category.type === categoryType
      );
    }
    
    return NextResponse.json({ data: products }, { status: 200 });
  } catch (error: any) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.sku || !body.name || body.price === undefined) {
      return NextResponse.json(
        { error: 'Kode barang, nama, dan harga jual wajib diisi' },
        { status: 400 }
      );
    }

    // Round stock to 2 decimal places if provided
    if (body.stock !== undefined) {
      body.stock = roundStock(body.stock);
    }
    if (!body.category) delete body.category;
    if (!body.warehouse) delete body.warehouse;

    const product = await Product.create(body);
    
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name color')
      .populate('warehouse', 'code name');

    return NextResponse.json(
      { message: 'Product created successfully', product: populatedProduct },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create product error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Kode barang sudah dipakai produk lain' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
