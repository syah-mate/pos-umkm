import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';

// GET all categories
export async function GET() {
  try {
    await dbConnect();
    
    // Auto-migrate: Update categories that don't have type field
    await Category.updateMany(
      { $or: [{ type: { $exists: false } }, { type: null }] },
      { $set: { type: 'product' } }
    );
    
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, description, icon, color, type } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    console.log('Creating category with type:', type);

    const category = await Category.create({
      name,
      description,
      icon,
      color,
      type: type || 'product', // Default to 'product' if not specified
    });

    console.log('Category created:', category);

    return NextResponse.json(
      { message: 'Category created successfully', category },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create category error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
