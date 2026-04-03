import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';

// Migrate existing categories to have type field
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Update all categories that don't have type field or have null/undefined type
    const result = await Category.updateMany(
      { $or: [{ type: { $exists: false } }, { type: null }] },
      { $set: { type: 'product' } }
    );

    console.log('Migration result:', result);

    return NextResponse.json({
      message: 'Categories migrated successfully',
      modifiedCount: result.modifiedCount,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate categories', details: error.message },
      { status: 500 }
    );
  }
}
