import { Schema, model, models, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  phone?: string;
  googleId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, unique: true, sparse: true, trim: true },
    googleId: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    displayName: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
  },
  { timestamps: true },
);

userSchema.virtual("subscriptions", {
  ref: "Subscription",
  localField: "_id",
  foreignField: "userId",
});
userSchema.virtual("deviceTokens", {
  ref: "DeviceToken",
  localField: "_id",
  foreignField: "userId",
});

export const User =
  (models.User as Model<IUser>) ||
  model<IUser>("User", userSchema);
