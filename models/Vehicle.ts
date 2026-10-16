import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVehicleCapacity {
  besar: number;
  medium: number;
  kecil: number;
}

export interface IVehicle extends Document {
  name: string;
  plateNumber?: string;
  driverName: string;
  driverPhone?: string;
  capacity: IVehicleCapacity;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    name: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
    },
    plateNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    driverName: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
    },
    // Muatan maksimal per tipe ukuran barang (jumlah unit)
    capacity: {
      besar: { type: Number, default: 0, min: 0 },
      medium: { type: Number, default: 0, min: 0 },
      kecil: { type: Number, default: 0, min: 0 },
    },
    notes: {
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

const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

export default Vehicle;
