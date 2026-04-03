import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITransactionItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

export interface ITransaction extends Document {
  invoiceNumber: string;
  items: ITransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'qris' | 'debit' | 'credit' | 'e-wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  cashReceived?: number;
  change?: number;
  customer?: mongoose.Types.ObjectId;
  customerName?: string;
  cashier:  mongoose.Types.ObjectId;
  cashierName: string;
  shift?: mongoose.Types.ObjectId;
  notes?: string;
  isSynced: boolean;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionItemSchema = new Schema<ITransactionItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
  },
}, { _id: false });

const TransactionSchema = new Schema<ITransaction>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: [TransactionItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'qris', 'debit', 'credit', 'e-wallet'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    cashReceived: {
      type: Number,
      min: 0,
    },
    change: {
      type: Number,
      min: 0,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: {
      type: String,
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
    shift: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
    },
    notes: {
      type: String,
    },
    isSynced: {
      type: Boolean,
      default: true,
    },
    syncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
TransactionSchema.index({ invoiceNumber: 1 });
TransactionSchema.index({ cashier: 1, createdAt: -1 });
TransactionSchema.index({ customer: 1, createdAt: -1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ paymentStatus: 1 });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
