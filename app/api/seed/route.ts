import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Supplier from '@/models/Supplier';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const results = [];

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });

    if (!existingAdmin) {
      // Create admin user
      const admin = await User.create({
        name: 'admin',
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'admin',
      });

      results.push({
        type: 'Admin User',
        message: 'Admin user created successfully',
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        }
      });
    } else {
      results.push({
        type: 'Admin User',
        message: 'Admin user already exists',
      });
    }

    // Check if suppliers already exist
    const existingSuppliers = await Supplier.countDocuments();

    if (existingSuppliers === 0) {
      // Create sample suppliers
      const suppliers = await Supplier.insertMany([
        {
          name: 'PT. Bahan Baku Makmur',
          contactPerson: 'Budi Santoso',
          email: 'budi@bahanbaku.com',
          phone: '081234567890',
          address: 'Jl. Industri No. 123, Jakarta',
          notes: 'Supplier bahan baku utama',
          isActive: true,
        },
        {
          name: 'CV. Fresh Ingredients',
          contactPerson: 'Siti Rahayu',
          email: 'siti@freshingredients.com',
          phone: '081234567891',
          address: 'Jl. Sayuran No. 45, Bandung',
          notes: 'Supplier sayuran dan bahan segar',
          isActive: true,
        },
        {
          name: 'Toko Bumbu Nusantara',
          contactPerson: 'Ahmad Fauzi',
          email: 'ahmad@bumbunusantara.com',
          phone: '081234567892',
          address: 'Jl. Rempah No. 78, Surabaya',
          notes: 'Supplier bumbu dan rempah-rempah',
          isActive: true,
        },
      ]);

      results.push({
        type: 'Suppliers',
        message: `${suppliers.length} suppliers created successfully`,
        data: suppliers.map(s => ({ id: s._id, name: s.name })),
      });
    } else {
      results.push({
        type: 'Suppliers',
        message: `${existingSuppliers} suppliers already exist`,
      });
    }

    return NextResponse.json(
      { 
        message: 'Seeding completed',
        results,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'An error occurred during seeding', message: error.message },
      { status: 500 }
    );
  }
}
