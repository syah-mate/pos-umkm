import mongoose, { Document, Model, Schema } from 'mongoose';
// Import Category to ensure it's registered before Product
import Category from './Category';
import './Warehouse';

export interface IProduct extends Document {
  sku: string;
  name: string;
  description?: string;
  category?: mongoose.Types.ObjectId;
  sizeType: 'besar' | 'medium' | 'kecil';
  warehouse?: mongoose.Types.ObjectId;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  barcode?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    // Tipe ukuran barang, dipakai untuk menghitung muatan kendaraan
    sizeType: {
      type: String,
      enum: ['besar', 'medium', 'kecil'],
      default: 'kecil',
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      default: 5,
      min: 0,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: ['pcs', 'kg', 'gram', 'liter', 'ml', 'box', 'pack', 'dus', 'karton', 'sak', 'bal', 'lusin'],
      default: 'pcs',
    },
    barcode: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better search performance
ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ warehouse: 1 });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
