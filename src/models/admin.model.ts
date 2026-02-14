import { Schema, model, models, type Document, type Model } from "mongoose";

export interface IAdmin extends Document {
  username: string;
  password: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    displayName: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Admin =
  (models.Admin as Model<IAdmin>) ||
  model<IAdmin>("Admin", adminSchema);
