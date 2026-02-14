import { Schema, model, models, type Document, type Model, type Types } from "mongoose";

export interface IDeviceToken extends Document {
  token: string;
  userId?: Types.ObjectId;
  platform: string;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    platform: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const DeviceToken =
  (models.DeviceToken as Model<IDeviceToken>) ||
  model<IDeviceToken>("DeviceToken", deviceTokenSchema);
