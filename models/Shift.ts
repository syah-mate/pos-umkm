import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IShift extends Document {
  shiftName: string;
  cashier: mongoose.Types.ObjectId;
  cashierName: string;
  startTime: Date;
  endTime?: Date;
  startingCash: number;
  endingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  totalTransactions: number;
  totalSales: number;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    shiftName: {
      type: String,
      required: true,
    },
    cashier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cashierName: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    startingCash: {
      type: Number,
      required: true,
      min: 0,
    },
    endingCash: {
      type: Number,
      min: 0,
    },
    expectedCash: {
      type: Number,
      min: 0,
    },
    cashDifference: {
      type: Number,
    },
    totalTransactions: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
ShiftSchema.index({ cashier: 1, createdAt: -1 });
ShiftSchema.index({ status: 1 });

const Shift: Model<IShift> =
  mongoose.models.Shift || mongoose.model<IShift>('Shift', ShiftSchema);

export default Shift;
