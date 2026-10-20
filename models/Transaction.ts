import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITransactionItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  sizeType?: 'besar' | 'medium' | 'kecil';
  unit?: string;
  cost?: number;
  notes?: string;
}

export interface ITransactionPayment {
  _id?: mongoose.Types.ObjectId;
  amount: number;
  method: string;
  date: Date;
  notes?: string;
  receivedByName?: string;
  delivery?: mongoose.Types.ObjectId;
}

export interface ITransaction extends Document {
  invoiceNumber: string;
  items: ITransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'qris' | 'debit' | 'credit' | 'e-wallet';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'pending' | 'failed' | 'refunded';
  amountPaid: number;
  payments: ITransactionPayment[];
  dueDate?: Date;
  deliveryStatus: 'pending' | 'scheduled' | 'on_delivery' | 'delivered' | 'not_required';
  delivery?: mongoose.Types.ObjectId;
  customerPhone?: string;
  customerAddress?: string;
  cashReceived?: number;
  change?: number;
  customer?: mongoose.Types.ObjectId;
  customerName?: string;
  cashier:  mongoose.Types.ObjectId;
  cashierName: string;
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
  sizeType: {
    type: String,
    enum: ['besar', 'medium', 'kecil'],
  },
  unit: {
    type: String,
  },
  // Snapshot harga modal (HPP per unit) saat transaksi dibuat
  cost: {
    type: Number,
    min: 0,
  },
  notes: {
    type: String,
  },
}, { _id: false });

const TransactionPaymentSchema = new Schema<ITransactionPayment>({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  method: {
    type: String,
    default: 'cash',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
  receivedByName: {
    type: String,
  },
  delivery: {
    type: Schema.Types.ObjectId,
    ref: 'Delivery',
  },
});

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
      enum: ['cash', 'transfer', 'qris', 'debit', 'credit', 'e-wallet'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'pending', 'failed', 'refunded'],
      default: 'unpaid',
    },
    // Total yang sudah dibayar (DP + pelunasan)
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    payments: [TransactionPaymentSchema],
    dueDate: {
      type: Date,
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'on_delivery', 'delivered', 'not_required'],
      default: 'pending',
    },
    delivery: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
    },
    customerPhone: {
      type: String,
    },
    customerAddress: {
      type: String,
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
TransactionSchema.index({ deliveryStatus: 1 });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
