import mongoose, { Document, Model, Schema } from 'mongoose';
import './Vehicle';
import './Transaction';

export interface IDeliveryExpense {
  _id?: mongoose.Types.ObjectId;
  category: string;
  description?: string;
  amount: number;
  date: Date;
  createdByName?: string;
}

export interface IDelivery extends Document {
  deliveryNumber: string;
  name: string;
  date: Date;
  vehicle: mongoose.Types.ObjectId;
  vehicleName: string;
  plateNumber?: string;
  driverName: string;
  transactions: mongoose.Types.ObjectId[];
  expenses: IDeliveryExpense[];
  status: 'planned' | 'on_delivery' | 'completed' | 'cancelled';
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  departedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryExpenseSchema = new Schema<IDeliveryExpense>({
  category: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  createdByName: {
    type: String,
  },
});

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryNumber: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Delivery name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    vehicleName: {
      type: String,
      required: true,
    },
    plateNumber: {
      type: String,
    },
    driverName: {
      type: String,
      required: true,
    },
    transactions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],
    expenses: [DeliveryExpenseSchema],
    status: {
      type: String,
      enum: ['planned', 'on_delivery', 'completed', 'cancelled'],
      default: 'planned',
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByName: {
      type: String,
    },
    departedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

DeliverySchema.index({ date: -1 });
DeliverySchema.index({ status: 1 });

const Delivery: Model<IDelivery> =
  mongoose.models.Delivery || mongoose.model<IDelivery>('Delivery', DeliverySchema);

export default Delivery;
