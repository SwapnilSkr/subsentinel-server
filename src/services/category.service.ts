import { Types } from "mongoose";
import { Category } from "../models";

const DEFAULT_CATEGORIES = [
  { name: "Entertainment", icon: "movie", color: "#E50914" },
  { name: "Music", icon: "music_note", color: "#1DB954" },
  { name: "Productivity", icon: "work", color: "#4285F4" },
  { name: "Cloud Storage", icon: "cloud", color: "#5F6368" },
  { name: "Gaming", icon: "sports_esports", color: "#9147FF" },
  { name: "News", icon: "newspaper", color: "#1A73E8" },
  { name: "Education", icon: "school", color: "#FF6D00" },
  { name: "Health & Fitness", icon: "fitness_center", color: "#0F9D58" },
  { name: "Finance", icon: "account_balance", color: "#34A853" },
  { name: "Communication", icon: "chat", color: "#00BCD4" },
  { name: "Shopping", icon: "shopping_bag", color: "#FF9800" },
  { name: "Food & Delivery", icon: "restaurant", color: "#F44336" },
  { name: "Transportation", icon: "directions_car", color: "#607D8B" },
  { name: "Utilities", icon: "build", color: "#795548" },
];

/**
 * Seed default categories if not already present
 */
export async function seedDefaultCategories(): Promise<void> {
  const existingCount = await Category.countDocuments({ isDefault: true });
  if (existingCount > 0) return;

  const defaults = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    isDefault: true,
    userId: null,
  }));

  await Category.insertMany(defaults);
  console.log(`Seeded ${defaults.length} default categories`);
}

/**
 * Get all categories (defaults + user's custom)
 */
export async function getAllCategories(userId: string): Promise<any[]> {
  return await Category.find({
    $or: [
      { isDefault: true },
      { userId: new Types.ObjectId(userId) },
    ],
  }).sort({ isDefault: -1, name: 1 });
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: string): Promise<any | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return await Category.findById(id);
}

/**
 * Create a user-custom category
 */
export async function createCategory(
  data: { name: string; icon: string; color: string; logoUrl?: string },
  userId: string,
): Promise<any> {
  return await Category.create({
    ...data,
    isDefault: false,
    userId: new Types.ObjectId(userId),
  });
}

/**
 * Update a user-created category (cannot update defaults)
 */
export async function updateCategory(
  id: string,
  data: { name?: string; icon?: string; color?: string; logoUrl?: string },
  userId: string,
): Promise<any | null> {
  if (!Types.ObjectId.isValid(id)) return null;

  return await Category.findOneAndUpdate(
    { _id: id, userId: new Types.ObjectId(userId), isDefault: false },
    data,
    { new: true, runValidators: true },
  );
}

/**
 * Delete a user-created category (cannot delete defaults)
 */
export async function deleteCategory(
  id: string,
  userId: string,
): Promise<boolean> {
  if (!Types.ObjectId.isValid(id)) return false;

  const result = await Category.findOneAndDelete({
    _id: id,
    userId: new Types.ObjectId(userId),
    isDefault: false,
  });
  return result !== null;
}
