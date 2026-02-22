import { Types } from "mongoose";
import { Category } from "../models";
import { ENV } from "../config";

/**
 * Get all categories (defaults + user's custom)
 */
export async function getAllCategories(userId: string): Promise<any[]> {
	return await Category.find({
		$or: [{ isDefault: true }, { userId: new Types.ObjectId(userId) }],
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
	const logoUrl = data.logoUrl || ENV.DEFAULT_CATEGORY_LOGO_URL || undefined;

	return await Category.create({
		...data,
		logoUrl,
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
