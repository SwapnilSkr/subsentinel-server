import { Schema, model, models, type Document, type Model, type Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  icon: string;
  color: string;
  logoUrl?: string;
  isDefault: boolean;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true },
    color: { type: String, required: true },
    logoUrl: String,
    isDefault: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true },
);

// Unique category name per user (null userId = default categories)
categorySchema.index({ name: 1, userId: 1 }, { unique: true });

export const Category =
  (models.Category as Model<ICategory>) ||
  model<ICategory>("Category", categorySchema);
