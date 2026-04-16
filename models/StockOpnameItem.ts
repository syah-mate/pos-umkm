import mongoose, { Document, Model, Schema } from 'mongoose';

export type OpnameReason =
  | 'susut_kadaluarsa'
  | 'rusak'
  | 'pencurian'
  | 'kesalahan_input'
  | 'lainnya';

export interface IStockOpnameItem extends Document {
  session: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productName: string;         // denormalized
  sku: string;                 // denormalized
  category: string;            // denormalized (nama kategori)
  unit: string;                // denormalized
  snapshotStock: number;       // stok sistem saat sesi dibuka
  physicalCount: number | null; // null = belum dihitung
  difference: number | null;   // physicalCount - snapshotStock, null jika belum dihitung
  costAtTime: number;          // HPP produk saat snapshot
  lossValue: number;           // Math.abs(difference) * costAtTime jika difference < 0
  reason?: OpnameReason;
  notes?: string;
  isCounted: boolean;
  countedBy?: mongoose.Types.ObjectId;
  countedByName?: string;
  countedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockOpnameItemSchema = new Schema<IStockOpnameItem>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'StockOpname', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    category: { type: String, default: '' },
    unit: { type: String, default: 'pcs' },
    snapshotStock: { type: Number, required: true },
    physicalCount: { type: Number, default: null },
    difference: { type: Number, default: null },
    costAtTime: { type: Number, default: 0 },
    lossValue: { type: Number, default: 0 },
    reason: {
      type: String,
      enum: ['susut_kadaluarsa', 'rusak', 'pencurian', 'kesalahan_input', 'lainnya'],
    },
    notes: { type: String },
    isCounted: { type: Boolean, default: false },
    countedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    countedByName: { type: String },
    countedAt: { type: Date },
  },
  { timestamps: true }
);

StockOpnameItemSchema.index({ session: 1 });
StockOpnameItemSchema.index({ session: 1, product: 1 });
StockOpnameItemSchema.index({ session: 1, isCounted: 1 });

const StockOpnameItem: Model<IStockOpnameItem> =
  mongoose.models.StockOpnameItem ||
  mongoose.model<IStockOpnameItem>('StockOpnameItem', StockOpnameItemSchema);

export default StockOpnameItem;
