import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStockOpname extends Document {
  sessionName: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  categoryFilter: mongoose.Types.ObjectId[]; // kosong = semua kategori
  openedBy: mongoose.Types.ObjectId;
  openedByName: string;
  finalizedBy?: mongoose.Types.ObjectId;
  finalizedByName?: string;
  openedAt: Date;
  finalizedAt?: Date;
  totalItems: number;
  countedItems: number;
  totalDifference: number;      // total selisih qty (bisa negatif)
  totalLossValue: number;       // total kerugian dalam Rupiah (HPP × selisih negatif)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockOpnameSchema = new Schema<IStockOpname>(
  {
    sessionName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    categoryFilter: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openedByName: { type: String, required: true },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedByName: { type: String },
    openedAt: { type: Date, default: Date.now },
    finalizedAt: { type: Date },
    totalItems: { type: Number, default: 0 },
    countedItems: { type: Number, default: 0 },
    totalDifference: { type: Number, default: 0 },
    totalLossValue: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

StockOpnameSchema.index({ status: 1 });
StockOpnameSchema.index({ openedAt: -1 });

const StockOpname: Model<IStockOpname> =
  mongoose.models.StockOpname ||
  mongoose.model<IStockOpname>('StockOpname', StockOpnameSchema);

export default StockOpname;
