import mongoose, { Schema, model, type Document } from "mongoose";

// Subscription Schema
export interface ISubscription extends Document {
  provider: string;
  amount: number;
  currency: string;
  next_billing: Date;
  status: "active" | "paused" | "cancelled";
  category?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    provider: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    next_billing: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled"],
      default: "active",
    },
    category: String,
    userId: String,
  },
  { timestamps: true },
);

// Device Token Schema (for FCM)
export interface IDeviceToken extends Document {
  token: string;
  userId?: string;
  platform: string;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    token: { type: String, required: true, unique: true },
    userId: String,
    platform: String,
  },
  { timestamps: true },
);

export const Subscription = model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
export const DeviceToken = model<IDeviceToken>(
  "DeviceToken",
  deviceTokenSchema,
);

// User Schema for Auth
const userSchema = new Schema({
  phone: { type: String, unique: true, sparse: true },
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true }, // For Google Auth
  displayName: String,
  photoUrl: String,
  createdAt: { type: Date, default: Date.now },
});

export const User = model("User", userSchema);
