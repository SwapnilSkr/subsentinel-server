import { Schema, model, models, type Document, type Model, type Types } from "mongoose";

export interface ISubscription extends Document {
  provider: string;
  amount: number;
  currency: string;
  next_billing: Date;
  status: "active" | "paused" | "cancelled";
  category?: string;
  userId?: Types.ObjectId;
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
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true },
);

export const Subscription =
  (models.Subscription as Model<ISubscription>) ||
  model<ISubscription>("Subscription", subscriptionSchema);
